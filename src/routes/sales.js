const express = require('express');
const { Op } = require('sequelize');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const { upload } = require('../upload');

const { sequelize } = require('../sequelize');

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
  OtpVerify,
  OrderProduct,
  StaffOrderProduct,
} = require('../models');

const router = express.Router();

// Minimal SMS sender using the provided HTTP API (same as staff login)
async function sendSmsViaGateway({ phoneE164, code }) {
  try {
    const API_URL = process.env.SMS_API_URL || 'http://182.18.162.128/api/mt/SendSMS';
    const APIKEY = process.env.SMS_APIKEY || '';
    const SENDERID = process.env.SMS_SENDERID || 'INDPGS';
    const ROUTE = process.env.SMS_ROUTE || '08';
    const CHANNEL = 'Trans';
    const DCS = '0';
    const FLASH = '0';

    if (!APIKEY) return { ok: false, reason: 'missing_apikey' };

    // Compose message: keep OTP clearly visible; SMS Autofill works on iOS by oneTimeCode
    // For Android SMS Retriever API, a hash is needed – not added here to avoid extra deps.
    const text = `Dear customer, the one time password to reset your password is ${code}. This OTP will expire in 5 minutes. Thinktech Software company`;

    const url = new URL(API_URL);
    url.searchParams.set('APIKEY', APIKEY);
    url.searchParams.set('senderid', SENDERID);
    url.searchParams.set('channel', CHANNEL);
    url.searchParams.set('DCS', DCS);
    url.searchParams.set('flashsms', FLASH);
    url.searchParams.set('number', phoneE164);
    url.searchParams.set('text', text);
    url.searchParams.set('route', ROUTE);

    const resp = await fetch(url.toString());
    return { ok: resp.ok };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

router.use(authRequired);
router.use(tenantEnforce);

// Global check for sales module access
router.use((req, res, next) => {
  if (req.user.role !== 'superadmin' && !req.subscriptionInfo?.salesEnabled) {
    return res.status(403).json({ success: false, message: 'Sales module is not enabled for your subscription' });
  }
  next();
});

// Order product options for the organization
router.get('/order-products', async (req, res) => {
  try {
    const orgId = req.tenantOrgAccountId || req.user?.orgAccountId || null;
    console.log('[DEBUG] /order-products orgId:', orgId);
    if (!orgId) return res.status(403).json({ success: false, message: 'No organization in context' });

    const products = await OrderProduct.findAll({
      where: {
        orgAccountId: orgId,
        isActive: true,
      },
      order: [['sortOrder', 'ASC'], ['id', 'DESC']],
    });
    console.log('[DEBUG] /order-products found count:', products.length);

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      size: p.size,
      defaultQty: Number(p.defaultQty || 1),
      defaultPrice: Number(p.defaultPrice || 0),
    }));

    return res.json({ success: true, products: data });
  } catch (e) {
    console.error('Failed to load order products:', e);
    return res.status(500).json({ success: false, message: 'Failed to load order products' });
  }
});


// Send OTP to client for visit verification
router.post('/send-client-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Clean phone number
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Valid phone number is required' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database (reuse existing OTP table)
    await OtpVerify.create({
      phone: normalizedPhone,
      code: otp,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
    });

    console.log('Client OTP generated for phone:', normalizedPhone, 'OTP:', otp);

    // Send OTP via SMS API using the same function as staff login
    try {
      const smsResult = await sendSmsViaGateway({ phoneE164: normalizedPhone, code: otp });
      console.log('SMS result:', smsResult);
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError);
      // Continue with OTP generation even if SMS fails
    }

    // Return response with OTP in development mode
    const includeOtp = process.env.OTP_INCLUDE_IN_RESPONSE === 'true';
    return res.json({
      success: true,
      message: 'OTP sent successfully',
      otp: includeOtp ? otp : undefined
    });
  } catch (e) {
    console.error('Send client OTP error:', e);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Submit a visit with optional attachments, geo and client verification
router.post('/visit', upload.single('clientSignature'), async (req, res) => {
  const t = await sequelize.transaction();
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
      checkInAltitude,
      checkInAddress,
      assignedJobId,
    } = req.body || {};

    // If OTP is provided, validate it
    if (clientOtp && phone) {
      // Find the most recent OTP for this phone number
      const otpRecord = await OtpVerify.findOne({
        where: {
          phone: normalizePhone(phone),
          expiresAt: { [Op.gt]: new Date() },
          consumedAt: null // Use consumedAt instead of usedAt
        },
        order: [['createdAt', 'DESC']],
        transaction: t
      });

      if (!otpRecord) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'No valid OTP found for this phone number. Please request a new OTP.'
        });
      }

      // Verify OTP
      if (otpRecord.code !== clientOtp.trim()) {
        console.log('OTP Mismatch - Expected:', otpRecord.code, 'Got:', clientOtp.trim());
        await t.rollback();
        console.log('Returning Invalid OTP error');
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      // Mark OTP as used
      await otpRecord.update({ consumedAt: new Date() }, { transaction: t });
    }

    const parsedCheckInLat = checkInLat !== undefined && checkInLat !== null && checkInLat !== '' ? Number(checkInLat) : null;
    const parsedCheckInLng = checkInLng !== undefined && checkInLng !== null && checkInLng !== '' ? Number(checkInLng) : null;
    const parsedCheckInAltitude = checkInAltitude !== undefined && checkInAltitude !== null && checkInAltitude !== '' ? Number(checkInAltitude) : null;
    const hasValidGeo = Number.isFinite(parsedCheckInLat) && Number.isFinite(parsedCheckInLng);

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
      checkInLat: hasValidGeo ? parsedCheckInLat : null,
      checkInLng: hasValidGeo ? parsedCheckInLng : null,
      checkInAltitude: Number.isFinite(parsedCheckInAltitude) ? parsedCheckInAltitude : null,
      checkInAddress: checkInAddress ? String(checkInAddress).slice(0, 255) : (location ? String(location).slice(0, 255) : null),
      checkInTime: hasValidGeo ? new Date() : null,
    }, { transaction: t });

    // Handle client signature - same pattern as order proof
    if (req.file && req.file.filename) {
      console.log('Saving signature file:', req.file.filename);
      await visit.update({ clientSignatureUrl: `/uploads/${req.file.filename}` }, { transaction: t });
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
    } catch (_) { }

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
      await visit.update({ verified: true }, { transaction: t });
    }

    // If linked to an assigned job, mark it IN PROGRESS (admin completes later)
    try {
      const aid = assignedJobId ? Number(assignedJobId) : null;
      if (Number.isFinite(aid)) {
        const job = await AssignedJob.findByPk(aid);
        if (job && job.staffUserId === req.user.id && job.status !== 'complete') {
          await job.update({ status: 'inprogress' }, { transaction: t });
        }
      }
    } catch (_) { }

    await t.commit();
    console.log('Visit form submitted successfully, visitId:', visit.id);
    return res.json({ success: true, visitId: visit.id });
  } catch (e) {
    await t.rollback();
    console.error('Visit form submission error:', e);
    console.error('Error details:', e.message, e.stack);
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
    const checkInLat = body.checkInLat !== undefined && body.checkInLat !== null && body.checkInLat !== '' ? Number(body.checkInLat) : null;
    const checkInLng = body.checkInLng !== undefined && body.checkInLng !== null && body.checkInLng !== '' ? Number(body.checkInLng) : null;
    const checkInAltitude = body.checkInAltitude !== undefined && body.checkInAltitude !== null && body.checkInAltitude !== '' ? Number(body.checkInAltitude) : null;
    const checkInAddress = body.checkInAddress ? String(body.checkInAddress).slice(0, 255) : null;

    // items can be JSON string or array
    let items = [];
    if (Array.isArray(body.items)) items = body.items;
    else if (typeof body.items === 'string') { try { items = JSON.parse(body.items); } catch (_) { items = []; } }

    // compute amounts
    const netAmount = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
    const gstAmount = Math.round(netAmount * 0.18);
    const totalAmount = netAmount + gstAmount;

    const order = await Order.create({
      orgAccountId: req.tenantOrgAccountId,
      userId: req.user.id,
      clientId: Number.isFinite(clientId) ? clientId : null,
      assignedJobId: Number.isFinite(assignedJobId) ? assignedJobId : null,
      orderDate,
      paymentMethod,
      remarks,
      checkInLat: Number.isFinite(checkInLat) ? checkInLat : null,
      checkInLng: Number.isFinite(checkInLng) ? checkInLng : null,
      checkInAltitude: Number.isFinite(checkInAltitude) ? checkInAltitude : null,
      checkInAddress,
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
    } catch (_) { }

    // Trigger incentive processing
    const salesIncentiveService = require('../services/salesIncentiveService');
    salesIncentiveService.processOrder(order.id).catch(err => console.error('Incentive processing failed:', err));

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
    if (!['pending', 'inprogress', 'complete'].includes(next)) {
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
    if (!['pending', 'inprogress', 'complete'].includes(next)) {
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
    const period = ['daily', 'weekly', 'monthly'].includes(String(req.query?.period)) ? String(req.query.period) : 'daily';
    const tgt = await SalesTarget.findOne({
      where: { staffUserId: req.user.id, period },
      order: [['periodDate', 'DESC']],
    });
    return res.json({ success: true, target: tgt || null });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load target' });
  }
});

// Incentive target for logged-in staff
router.get('/incentives/current', async (req, res) => {
  try {
    const period = ['daily', 'weekly', 'monthly'].includes(String(req.query?.period)) ? String(req.query.period) : 'daily';
    const row = await IncentiveTarget.findOne({
      where: { staffUserId: req.user.id, period, active: true },
      order: [['periodDate', 'DESC']],
    });
    return res.json({ success: true, incentive: row || null });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load incentive' });
  }
});

module.exports = router;
