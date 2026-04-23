const { MailQueue, MailCampaign, sequelize } = require('../models');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Reuse existing SMTP configuration (assuming emailService export or similar)
const emailConfig = {
  host: process.env.SMTP_HOST || 'mail.vetansutra.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'info@vetansutra.com',
    pass: process.env.SMTP_PASS || 'Fzc]I~V]m(.9'
  }
};

const transporter = nodemailer.createTransport(emailConfig);

const processMailQueue = async () => {
  console.log('📬 [MailJob] Checking for pending emails in queue...');

  // Find the oldest pending email
  const pendingMail = await MailQueue.findOne({
    where: { status: 'PENDING' },
    include: [{ model: MailCampaign, as: 'campaign' }],
    order: [['createdAt', 'ASC']]
  });

  if (!pendingMail) {
    // console.log('😴 [MailJob] Queue is empty.');
    return;
  }

  const { campaign, recipientEmail, recipientName } = pendingMail;

  console.log(`📧 [MailJob] Sending email to: ${recipientEmail} (Campaign #${campaign.id})`);

  try {
    // Update campaign status to SENDING if it's PENDING
    if (campaign.status === 'PENDING') {
      await campaign.update({ status: 'SENDING' });
    }

    // Insert tracking pixel
    const trackingUrl = `${process.env.BACKEND_URL || 'https://backend.vetansutra.com'}/superadmin/mail/track/${pendingMail.id}.gif`;
    
    // Placeholder replacement
    let personalizedBody = campaign.body
      .replace(/{{name}}/g, recipientName || 'Customer')
      .replace(/{{email}}/g, recipientEmail);

    const bodyWithTracking = `${personalizedBody}<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'ThinkTech Software'}" <${process.env.EMAIL_FROM_ADDRESS || 'info@vetansutra.com'}>`,
      to: recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail,
      subject: campaign.subject.replace(/{{name}}/g, recipientName || 'Customer').replace(/{{email}}/g, recipientEmail),
      html: bodyWithTracking
    };

    // Add attachment if exists
    if (campaign.attachmentPath && fs.existsSync(campaign.attachmentPath)) {
      mailOptions.attachments = [{
        filename: campaign.attachmentName || 'attachment',
        path: campaign.attachmentPath
      }];
    }

    // Send the email
    await transporter.sendMail(mailOptions);

    // Mark as SENT
    await pendingMail.update({
      status: 'SENT',
      sentAt: new Date()
    });

    // Update campaign sent count
    await campaign.increment('sentCount');

    // Check if the campaign is now fully completed
    const remaining = await MailQueue.count({
      where: { campaignId: campaign.id, status: 'PENDING' }
    });

    if (remaining === 0) {
      await campaign.update({ status: 'COMPLETED' });
      console.log(`✅ [MailJob] Campaign #${campaign.id} completed!`);
    }

  } catch (error) {
    console.error(`❌ [MailJob] Error sending to ${recipientEmail}:`, error.message);
    await pendingMail.update({
      status: 'FAILED',
      error: error.message
    });
  }
};

module.exports = { processMailQueue };
