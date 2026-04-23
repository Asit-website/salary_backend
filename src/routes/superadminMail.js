const express = require('express');
const router = express.Router();
const { MailCampaign, MailQueue, OrgAccount, sequelize } = require('../models');
const { tenantEnforce } = require('../middleware/tenant');
const multer = require('multer');
const ExcelJS = require('exceljs');

const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/mail-attachments';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
const excelUpload = multer({ storage: multer.memoryStorage() });

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Apply global auth and role protection
router.use(authRequired);
router.use(requireRole(['superadmin']));

// Start a Mailing Campaign
router.post('/campaign', upload.single('attachment'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { subject, body, recipientType, customEmails } = req.body;
    const attachment = req.file;

    // 1. Create the campaign record
    const campaign = await MailCampaign.create({
      subject,
      body,
      status: 'PENDING',
      createdBy: req.user.id,
      attachmentPath: attachment ? attachment.path : null,
      attachmentName: attachment ? attachment.originalname : null
    }, { transaction: t });

    let recipients = [];

    if (recipientType === 'all_clients') {
      // Fetch all active client business emails and names
      const clients = await OrgAccount.findAll({
        attributes: ['businessEmail', 'businessName'],
        where: { status: 'ACTIVE' }
      });
      recipients = clients
        .filter(c => !!c.businessEmail && c.businessEmail.includes('@'))
        .map(c => ({ email: c.businessEmail, name: c.businessName }));
    } else if (recipientType === 'custom') {
      let emails = customEmails;
      if (typeof emails === 'string') {
        try {
          emails = JSON.parse(emails);
        } catch (e) {
          emails = emails.split(',').map(e => e.trim());
        }
      }
      if (Array.isArray(emails)) {
        recipients = emails
          .filter(email => !!email && email.includes('@'))
          .map(email => ({ email, name: null }));
      }
    }

    if (recipients.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No valid recipients found' });
    }

    // 2. Populate the MailQueue
    const queueRecords = recipients.map(r => ({
      campaignId: campaign.id,
      recipientEmail: r.email,
      recipientName: r.name,
      status: 'PENDING'
    }));

    await MailQueue.bulkCreate(queueRecords, { transaction: t });

    // 3. Update total count
    await campaign.update({ totalRecipients: recipients.length }, { transaction: t });

    await t.commit();
    res.json({ success: true, campaignId: campaign.id, totalRecipients: recipients.length });
  } catch (error) {
    await t.rollback();
    console.error('Error creating mail campaign:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start a Mailing Campaign via Excel Upload
router.post('/campaign/excel', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'attachment', maxCount: 1 }]), async (req, res) => {
  const excelFile = req.files['file'] ? req.files['file'][0] : null;
  const attachment = req.files['attachment'] ? req.files['attachment'][0] : null;

  if (!excelFile) {
    return res.status(400).json({ success: false, message: 'No excel file uploaded' });
  }

  const t = await sequelize.transaction();
  try {
    const { subject, body } = req.body;
    
    // Parse Excel or CSV
    const workbook = new ExcelJS.Workbook();
    const isCsv = excelFile.originalname.toLowerCase().endsWith('.csv') || excelFile.mimetype === 'text/csv';
    
    if (isCsv) {
      const csvString = fs.readFileSync(excelFile.path, 'utf8');
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(csvString);
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.readFile(excelFile.path);
    }
    
    const worksheet = workbook.getWorksheet(1);
    
    let recipients = [];
    let emailColIndex = -1;
    let nameColIndex = -1;

    // 1. Find the email and name columns (Search header row)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').toLowerCase();
      if (val.includes('email') || val.includes('e-mail')) {
        emailColIndex = colNumber;
      }
      if (val.includes('name')) {
        nameColIndex = colNumber;
      }
    });

    // Fallback to first column if no header matches email
    if (emailColIndex === -1) emailColIndex = 1;

    // 2. Extract emails and optional names from rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const email = String(row.getCell(emailColIndex).value || '').trim();
      const name = nameColIndex !== -1 ? String(row.getCell(nameColIndex).value || '').trim() : null;
      
      if (email && email.includes('@')) {
        recipients.push({ email, name });
      }
    });

    // Deduplicate by email
    const uniqueMap = new Map();
    recipients.forEach(r => {
        if (!uniqueMap.has(r.email)) uniqueMap.set(r.email, r.name);
    });
    const uniqueRecipients = Array.from(uniqueMap.entries()).map(([email, name]) => ({ email, name }));

    if (uniqueRecipients.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No valid emails found in Excel' });
    }

    // 3. Create campaign
    const campaign = await MailCampaign.create({
      subject,
      body,
      status: 'PENDING',
      createdBy: req.user.id,
      totalRecipients: uniqueRecipients.length,
      attachmentPath: attachment ? attachment.path : null,
      attachmentName: attachment ? attachment.originalname : null
    }, { transaction: t });

    // 4. Populate Queue
    const queueRecords = uniqueRecipients.map(r => ({
      campaignId: campaign.id,
      recipientEmail: r.email,
      recipientName: r.name,
      status: 'PENDING'
    }));

    await MailQueue.bulkCreate(queueRecords, { transaction: t });

    await t.commit();
    
    // Clean up excel file
    if (excelFile && fs.existsSync(excelFile.path)) {
        fs.unlinkSync(excelFile.path);
    }

    res.json({ success: true, campaignId: campaign.id, totalRecipients: uniqueRecipients.length });
  } catch (error) {
    await t.rollback();
    console.error('Error processing Excel mail campaign:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Campaign Stats with Breakdown
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await MailCampaign.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    const campaignsWithStats = await Promise.all(campaigns.map(async (camp) => {
      const stats = await MailQueue.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.literal("SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END)"), 'sent'],
          [sequelize.literal("SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)"), 'failed'],
          [sequelize.literal("SUM(CASE WHEN is_opened = 1 THEN 1 ELSE 0 END)"), 'opened']
        ],
        where: { campaignId: camp.id },
        raw: true
      });

      return {
        ...camp.toJSON(),
        stats: stats[0] || { total: 0, sent: 0, failed: 0, opened: 0 }
      };
    }));

    res.json({ success: true, campaigns: campaignsWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Tracking Pixel Endpoint
// This should be public (no isSuperAdmin middleware)
router.get('/track/:queueId.gif', async (req, res) => {
  try {
    const { queueId } = req.params;
    const mail = await MailQueue.findByPk(queueId);
    
    if (mail && !mail.isOpened) {
      await mail.update({
        isOpened: true,
        openedAt: new Date()
      });
      // Optionally increment campaign openedCount if we add it to Campaign model, 
      // but calculating from Queue is more accurate per-recipient.
    }

    // Serve a 1x1 transparent GIF
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(pixel);
  } catch (error) {
    // Silently fail to not reveal tracking logic to client
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, { 'Content-Type': 'image/gif' });
    res.end(pixel);
  }
});

// Get Current Pending Queue Count
router.get('/queue/stats', async (req, res) => {
  try {
    const pendingCount = await MailQueue.count({ where: { status: 'PENDING' } });
    res.json({ success: true, pendingCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Detailed Campaign Stats & Recipient List
router.get('/campaign/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await MailCampaign.findByPk(id);
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const recipients = await MailQueue.findAll({
      where: { campaignId: id },
      order: [['createdAt', 'ASC']]
    });

    const stats = {
      total: recipients.length,
      sent: recipients.filter(r => r.status === 'SENT').length,
      failed: recipients.filter(r => r.status === 'FAILED').length,
      opened: recipients.filter(r => r.isOpened).length
    };

    res.json({ 
      success: true, 
      campaign, 
      recipients,
      stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export Campaign Report to Excel
router.get('/campaign/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await MailCampaign.findByPk(id);
    if (!campaign) return res.status(404).send('Campaign not found');

    const recipients = await MailQueue.findAll({
      where: { campaignId: id },
      order: [['createdAt', 'ASC']]
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mailing Report');

    worksheet.columns = [
      { header: 'Recipient Name', key: 'name', width: 25 },
      { header: 'Email Address', key: 'email', width: 35 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Sent At', key: 'sentAt', width: 25 },
      { header: 'Opened At', key: 'openedAt', width: 25 },
      { header: 'Error', key: 'error', width: 40 }
    ];

    recipients.forEach(r => {
      worksheet.addRow({
        name: r.recipientName || 'N/A',
        email: r.recipientEmail,
        status: r.isOpened ? 'OPENED' : r.status,
        sentAt: r.sentAt ? new Date(r.sentAt).toLocaleString() : '-',
        openedAt: r.openedAt ? new Date(r.openedAt).toLocaleString() : '-',
        error: r.error || ''
      });
    });

    // Formatting
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Campaign_Report_${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Resend a past campaign
router.post('/campaign/:id/resend', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const originalCampaign = await MailCampaign.findByPk(id);
    if (!originalCampaign) {
      return res.status(404).json({ success: false, message: 'Original campaign not found' });
    }

    // 1. Create a new campaign record copied from the original
    const newCampaign = await MailCampaign.create({
      subject: originalCampaign.subject,
      body: originalCampaign.body,
      status: 'PENDING',
      createdBy: req.user.id,
      attachmentPath: originalCampaign.attachmentPath,
      attachmentName: originalCampaign.attachmentName,
      totalRecipients: originalCampaign.totalRecipients
    }, { transaction: t });

    // 2. Fetch original recipients
    const originalRecipients = await MailQueue.findAll({
      where: { campaignId: id }
    });

    // 3. Populate new MailQueue with the same recipients
    const newQueueRecords = originalRecipients.map(r => ({
      campaignId: newCampaign.id,
      recipientEmail: r.recipientEmail,
      recipientName: r.recipientName,
      status: 'PENDING'
    }));

    await MailQueue.bulkCreate(newQueueRecords, { transaction: t });

    await t.commit();
    res.json({ success: true, campaignId: newCampaign.id, totalRecipients: newQueueRecords.length });
  } catch (error) {
    await t.rollback();
    console.error('Error resending campaign:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
