const express = require('express');
const { Op } = require('sequelize');
const { authRequired } = require('../middleware/auth');
const { upload } = require('../upload');

const {
  SalesVisit,
  SalesVisitAttachment,
  AppSetting,
  Client,
  AssignedJob,
  SalesTarget,
  Order,
  OrderItem,
  IncentiveTarget,
} = require('../models');

const router = express.Router();

router.use(authRequired);

// Submit a visit with optional attachments, geo and client verification
router.post('/visit', upload.single('clientSignature'), async (req, res) => {
  try {
    console.log('Visit form submission received');
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('File received:', req.file ? req.file.filename : 'No file');
    console.log('File details:', req.file);
    console.log('Content-Type:', req.get('Content-Type'));
    
    const {
      visitDate,
      salesPerson,
      visitType,
      clientName,
      phone,
      clientType,
      location,
      madeOrder,
      amount,
      clientOtp,
      checkInLat,
      checkInLng,
      assignedJobId,
    } = req.body || {};

    const visit = await SalesVisit.create({
      userId: req.user.id,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      salesPerson: salesPerson || null,
      visitType: visitType || null,
      clientName: clientName || null,
      phone: phone || null,
      clientType: clientType || null,
      location: location || null,
      madeOrder: madeOrder ? String(madeOrder) === 'true' || String(madeOrder) === '1' : false,
      amount: Number(amount || 0) || 0,
      clientOtp: clientOtp || null,
      checkInLat: checkInLat !== undefined && checkInLat !== null && checkInLat !== '' ? Number(checkInLat) : null,
      checkInLng: checkInLng !== undefined && checkInLng !== null && checkInLng !== '' ? Number(checkInLng) : null,
      checkInTime: (checkInLat && checkInLng) ? new Date() : null,
    });

    // Handle client signature - same pattern as order proof
    if (req.file && req.file.filename) {
      console.log('Saving signature file:', req.file.filename);
      await visit.update({ clientSignatureUrl: `/uploads/${req.file.filename}` });
      console.log('Signature saved successfully');
    } else {
      console.log('No signature file received');
    }

    // Note: For now, we're focusing on signature only
    // Attachments can be added later with a separate endpoint or different approach

    // Org features
    let features = { photoRequired: false, geoRequired: false, signatureOrOtpRequired: false };
    try {
      const row = await AppSetting.findOne({ where: { key: 'org_config' } });
      if (row?.value) {
        const cfg = JSON.parse(row.value);
        features = Object.assign(features, cfg?.features || {});
      }
    } catch (_) {}

    // Enforce photo proof if required (disabled for now since we removed attachments)
    // if (features.photoRequired && atts.length === 0) {
    //   return res.status(400).json({ success: false, message: 'At least one photo attachment is required' });
    // }

    // Verified computation
    const hasGeo = Number.isFinite(visit.checkInLat) && Number.isFinite(visit.checkInLng);
    const hasPhoto = false; // No attachments in this version
    const hasSigOrOtp = !!visit.clientSignatureUrl || !!visit.clientOtp;
    const needsSig = !!features.signatureOrOtpRequired;
    const needsGeo = !!features.geoRequired;

    const verified = (
      (needsGeo ? hasGeo : true)
      && (features.photoRequired ? hasPhoto : true)
      && (needsSig ? hasSigOrOtp : true)
    );

    if (verified && visit.verified !== true) {
      await visit.update({ verified: true });
    }

    // If linked to an assigned job, mark it IN PROGRESS (admin completes later)
    try {
      const aid = assignedJobId ? Number(assignedJobId) : null;
      if (Number.isFinite(aid)) {
        const job = await AssignedJob.findByPk(aid);
        if (job && job.staffUserId === req.user.id && job.status !== 'complete') {
          await job.update({ status: 'inprogress' });
        }
      }
    } catch (_) {}

    console.log('Visit form submitted successfully, visitId:', visit.id);
    return res.json({ success: true, visitId: visit.id });
  } catch (e) {
    console.error('Visit form submission error:', e);
    return res.status(500).json({ success: false, message: 'Failed to submit visit' });
  }
});

// Create order (direct or linked to assigned job)
router.post('/orders', upload.single('proof'), async (req, res) => {
  try {
    const body = req.body || {};
    const assignedJobId = body.assignedJobId ? Number(body.assignedJobId) : null;
    let clientId = body.clientId ? Number(body.clientId) : null;

    if (assignedJobId) {
      const job = await AssignedJob.findByPk(assignedJobId);
      if (!job || job.staffUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }
      clientId = clientId || job.clientId;
    }

    const orderDate = body.orderDate ? new Date(body.orderDate) : new Date();
    const paymentMethod = body.paymentMethod || null;
    const remarks = body.remarks || null;

    // items can be JSON string or array
    let items = [];
    if (Array.isArray(body.items)) items = body.items;
    else if (typeof body.items === 'string') { try { items = JSON.parse(body.items); } catch (_) { items = []; } }

    // compute amounts
    const netAmount = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
    const gstAmount = Math.round(netAmount * 0.18);
    const totalAmount = netAmount + gstAmount;

    const order = await Order.create({
      userId: req.user.id,
      clientId: Number.isFinite(clientId) ? clientId : null,
      assignedJobId: Number.isFinite(assignedJobId) ? assignedJobId : null,
      orderDate,
      paymentMethod,
      remarks,
      netAmount,
      gstAmount,
      totalAmount,
    });

    for (const it of items) {
      const qty = Number(it.qty) || 0;
      const price = Number(it.price) || 0;
      const amount = qty * price;
      await OrderItem.create({
        orderId: order.id,
        name: String(it.name || 'Product'),
        size: it.size ? String(it.size) : null,
        qty,
        price,
        amount,
        meta: it.meta || null,
      });
    }

    if (req.file && req.file.filename) {
      await order.update({ proofUrl: `/uploads/${req.file.filename}` });
    }

    const out = await Order.findByPk(order.id, {
      include: [
        { model: Client, as: 'client' },
        { model: AssignedJob, as: 'assignedJob' },
        { model: OrderItem, as: 'items' },
      ]
    });

    // Mark linked job IN PROGRESS (no auto-complete)
    try {
      if (Number.isFinite(assignedJobId)) {
        const job = await AssignedJob.findByPk(assignedJobId);
        if (job && job.staffUserId === req.user.id && job.status !== 'complete') {
          await job.update({ status: 'inprogress' });
        }
      }
    } catch (_) {}

    return res.json({ success: true, order: out });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Assigned jobs for logged-in staff (filter out deactivated clients)
router.get('/assigned-jobs', async (req, res) => {
  try {
    const rows = await AssignedJob.findAll({
      where: { staffUserId: req.user.id },
      include: [{ model: Client, as: 'client' }],
      order: [['createdAt', 'DESC']],
      limit: 500,
    });
    // Filter out jobs where client is deactivated
    const filtered = rows.filter(j => {
      const c = j.client;
      if (!c) return true; // No client linked, show the job
      return c.active !== false; // Only show if client is active
    });
    return res.json({ success: true, jobs: filtered });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load assigned jobs' });
  }
});

// alias underscore
router.get('/assigned_jobs', async (req, res) => {
  try {
    const rows = await AssignedJob.findAll({
      where: { staffUserId: req.user.id },
      include: [{ model: Client, as: 'client' }],
      order: [['createdAt', 'DESC']],
      limit: 500,
    });
    // Filter out jobs where client is deactivated
    const filtered = rows.filter(j => {
      const c = j.client;
      if (!c) return true;
      return c.active !== false;
    });
    return res.json({ success: true, jobs: filtered });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load assigned jobs' });
  }
});

// Assigned job detail
router.get('/assigned-jobs/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await AssignedJob.findByPk(id, { include: [{ model: Client, as: 'client' }] });
    if (!row || row.staffUserId !== req.user.id) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, job: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load job' });
  }
});

// alias underscore
router.get('/assigned_jobs/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await AssignedJob.findByPk(id, { include: [{ model: Client, as: 'client' }] });
    if (!row || row.staffUserId !== req.user.id) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, job: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load job' });
  }
});

// Update assigned job status (captures start/end time and location)
router.put('/assigned-jobs/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await AssignedJob.findByPk(id, { include: [{ model: Client, as: 'client' }] });
    if (!row || row.staffUserId !== req.user.id) return res.status(404).json({ success: false, message: 'Not found' });

    const next = String(req.body?.status || '').toLowerCase();
    if (!['pending','inprogress','complete'].includes(next)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const patch = { status: next };

    if (next === 'inprogress') {
      // First start: set start time and coords once
      if (!row.startedAt) {
        patch.startedAt = new Date();
        const lat = req.body?.startLat;
        const lng = req.body?.startLng;
        const acc = req.body?.startAccuracy;
        if (lat !== undefined && lng !== undefined) {
          const nlat = Number(lat);
          const nlng = Number(lng);
          if (Number.isFinite(nlat) && Number.isFinite(nlng)) {
            patch.startLat = nlat;
            patch.startLng = nlng;
          }
        }
        if (acc !== undefined) {
          const nacc = Number(acc);
          if (Number.isFinite(nacc)) patch.startAccuracy = nacc;
        }
      }
      // Stop job: allow capturing end info while status remains 'inprogress'
      const stop = req.body?.stopJob === true || String(req.body?.stopJob) === '1';
      const elat = req.body?.endLat;
      const elng = req.body?.endLng;
      const eacc = req.body?.endAccuracy;
      if (!row.endedAt && (stop || elat !== undefined || elng !== undefined || eacc !== undefined)) {
        patch.endedAt = new Date();
        if (elat !== undefined && elng !== undefined) {
          const nlat2 = Number(elat);
          const nlng2 = Number(elng);
          if (Number.isFinite(nlat2) && Number.isFinite(nlng2)) {
            patch.endLat = nlat2;
            patch.endLng = nlng2;
          }
        }
        if (eacc !== undefined) {
          const nacc2 = Number(eacc);
          if (Number.isFinite(nacc2)) patch.endAccuracy = nacc2;
        }
      }
    } else if (next === 'complete') {
      // Admin completion: set end timestamp/coords if not yet set
      if (!row.endedAt) {
        patch.endedAt = new Date();
        const elat = req.body?.endLat ?? req.body?.startLat;
        const elng = req.body?.endLng ?? req.body?.startLng;
        const eacc = req.body?.endAccuracy ?? req.body?.startAccuracy;
        if (elat !== undefined && elng !== undefined) {
          const nlat2 = Number(elat);
          const nlng2 = Number(elng);
          if (Number.isFinite(nlat2) && Number.isFinite(nlng2)) {
            patch.endLat = nlat2;
            patch.endLng = nlng2;
          }
        }
        if (eacc !== undefined) {
          const nacc2 = Number(eacc);
          if (Number.isFinite(nacc2)) patch.endAccuracy = nacc2;
        }
      }
    }

    await row.update(patch);
    const fresh = await AssignedJob.findByPk(id, { include: [{ model: Client, as: 'client' }] });
    return res.json({ success: true, job: fresh });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update job' });
  }
});

// alias underscore
router.put('/assigned_jobs/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await AssignedJob.findByPk(id, { include: [{ model: Client, as: 'client' }] });
    if (!row || row.staffUserId !== req.user.id) return res.status(404).json({ success: false, message: 'Not found' });

    const next = String(req.body?.status || '').toLowerCase();
    if (!['pending','inprogress','complete'].includes(next)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const patch = { status: next };

    if (next === 'inprogress') {
      if (!row.startedAt) {
        patch.startedAt = new Date();
        const lat = req.body?.startLat;
        const lng = req.body?.startLng;
        const acc = req.body?.startAccuracy;
        if (lat !== undefined && lng !== undefined) {
          const nlat = Number(lat);
          const nlng = Number(lng);
          if (Number.isFinite(nlat) && Number.isFinite(nlng)) {
            patch.startLat = nlat;
            patch.startLng = nlng;
          }
        }
        if (acc !== undefined) {
          const nacc = Number(acc);
          if (Number.isFinite(nacc)) patch.startAccuracy = nacc;
        }
      }
      const stop = req.body?.stopJob === true || String(req.body?.stopJob) === '1';
      const elat = req.body?.endLat;
      const elng = req.body?.endLng;
      const eacc = req.body?.endAccuracy;
      if (!row.endedAt && (stop || elat !== undefined || elng !== undefined || eacc !== undefined)) {
        patch.endedAt = new Date();
        if (elat !== undefined && elng !== undefined) {
          const nlat2 = Number(elat);
          const nlng2 = Number(elng);
          if (Number.isFinite(nlat2) && Number.isFinite(nlng2)) {
            patch.endLat = nlat2;
            patch.endLng = nlng2;
          }
        }
        if (eacc !== undefined) {
          const nacc2 = Number(eacc);
          if (Number.isFinite(nacc2)) patch.endAccuracy = nacc2;
        }
      }
    } else if (next === 'complete') {
      if (!row.endedAt) {
        patch.endedAt = new Date();
        const elat = req.body?.endLat ?? req.body?.startLat;
        const elng = req.body?.endLng ?? req.body?.startLng;
        const eacc = req.body?.endAccuracy ?? req.body?.startAccuracy;
        if (elat !== undefined && elng !== undefined) {
          const nlat2 = Number(elat);
          const nlng2 = Number(elng);
          if (Number.isFinite(nlat2) && Number.isFinite(nlng2)) {
            patch.endLat = nlat2;
            patch.endLng = nlng2;
          }
        }
        if (eacc !== undefined) {
          const nacc2 = Number(eacc);
          if (Number.isFinite(nacc2)) patch.endAccuracy = nacc2;
        }
      }
    }

    await row.update(patch);
    const fresh = await AssignedJob.findByPk(id, { include: [{ model: Client, as: 'client' }] });
    return res.json({ success: true, job: fresh });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update job' });
  }
});

// Daily summary for a given date (YYYY-MM-DD)
router.get('/summary', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    // Visits for conversion rate denominator
    const visits = await SalesVisit.findAll({ where: { userId: req.user.id, visitDate: { [Op.between]: [start, end] } } });

    // Orders for the day
    const orders = await Order.findAll({ where: { userId: req.user.id, orderDate: { [Op.between]: [start, end] } } });

    const totalAmount = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const totalVisits = visits.length || 1; // avoid divide-by-zero
    const conversionRate = Math.round((totalOrders / totalVisits) * 100);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0;

    const summary = { date, totalAmount, totalOrders, conversionRate, avgOrderValue, target: 0 };

    return res.json({ success: true, summary });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load summary' });
  }
});

// Weekly sales data for a given date range
router.get('/weekly', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : new Date();
    
    // Get orders for each day of the week
    const weeklyData = [];
    const current = new Date(start);
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);
      
      const orders = await Order.findAll({ 
        where: { 
          userId: req.user.id, 
          orderDate: { [Op.between]: [dayStart, dayEnd] } 
        } 
      });
      
      const totalAmount = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
      weeklyData.push(totalAmount);
      
      current.setDate(current.getDate() + 1);
    }

    return res.json({ success: true, data: weeklyData });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load weekly data' });
  }
});

// Current target for logged-in staff
router.get('/targets/current', async (req, res) => {
  try {
    const period = ['daily','weekly','monthly'].includes(String(req.query?.period)) ? String(req.query.period) : 'daily';
    const tgt = await SalesTarget.findOne({
      where: { staffUserId: req.user.id, period },
      order: [['periodDate','DESC']],
    });
    return res.json({ success: true, target: tgt || null });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load target' });
  }
});

// Incentive target for logged-in staff
router.get('/incentives/current', async (req, res) => {
  try {
    const period = ['daily','weekly','monthly'].includes(String(req.query?.period)) ? String(req.query.period) : 'daily';
    const row = await IncentiveTarget.findOne({
      where: { staffUserId: req.user.id, period, active: true },
      order: [['periodDate','DESC']],
    });
    return res.json({ success: true, incentive: row || null });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load incentive' });
  }
});

module.exports = router;