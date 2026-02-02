const express = require('express');
const router = express.Router();

const { Plan, OrgAccount, Subscription, User } = require('../models');
const bcrypt = require('bcryptjs');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { Op } = require('sequelize');

router.use(authRequired);
router.use(requireRole(['superadmin']));

// Plans
router.get('/plans', async (_req, res) => {
  try {
    const rows = await Plan.findAll({ order: [['name', 'ASC']] });
    return res.json({ success: true, plans: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load plans' });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const { code, name, periodDays, price, features, active } = req.body || {};
    if (!code || !name || !periodDays) {
      return res.status(400).json({ success: false, message: 'code, name, periodDays required' });
    }
    const row = await Plan.create({
      code: String(code).toUpperCase(),
      name,
      periodDays: Number(periodDays),
      price: Number(price || 0),
      features: features || null,
      active: active !== false,
    });
    return res.json({ success: true, plan: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create plan' });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const row = await Plan.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const { code, name, periodDays, price, features, active } = req.body || {};
    await row.update({
      ...(code !== undefined ? { code: String(code).toUpperCase() } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(periodDays !== undefined ? { periodDays: Number(periodDays) } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(features !== undefined ? { features } : {}),
      ...(active !== undefined ? { active: !!active } : {}),
    });
    return res.json({ success: true, plan: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update plan' });
  }
});

// OrgAccounts
router.get('/clients', async (_req, res) => {
  try {
    const rows = await OrgAccount.findAll({ order: [['createdAt', 'DESC']] });
    const now = new Date();
    for (const org of rows) {
      try {
        const sub = await Subscription.findOne({
          where: { orgAccountId: org.id, status: 'ACTIVE' },
          order: [['endAt', 'DESC']],
        });
        const shouldBeActive = !!(sub && new Date(sub.endAt) >= now);
        const targetStatus = shouldBeActive ? 'ACTIVE' : 'DISABLED';
        if (org.status !== targetStatus) {
          await org.update({ status: targetStatus });
        }
      } catch (_) {}
    }
    return res.json({ success: true, clients: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load clients' });
  }
});

// Get client plan details
router.get('/clients/:id/plan-details', async (req, res) => {
  try {
    const clientId = req.params.id;
    
    // Get latest subscription with plan details
    const subscription = await Subscription.findOne({
      where: { orgAccountId: clientId },
      include: [{
        model: Plan,
        as: 'plan'
      }],
      order: [['endAt', 'DESC']]
    });

    if (!subscription) {
      return res.json({ 
        success: true, 
        planDetails: {
          planName: null,
          startDate: null,
          endDate: null,
          status: 'no_plan',
          features: []
        }
      });
    }

    const now = new Date();
    const isExpired = new Date(subscription.endAt) < now;
    
    return res.json({ 
      success: true, 
      planDetails: {
        planName: subscription.plan?.name || 'Unknown Plan',
        startDate: subscription.startAt,
        endDate: subscription.endAt,
        status: isExpired ? 'expired' : 'active',
        features: subscription.plan?.features || []
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load plan details' });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const { name, phone, status = 'ACTIVE', clientType, location, extra, businessEmail, state, city, channelPartnerId, roleDescription, employeeCount } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const row = await OrgAccount.create({
      name,
      phone: phone || null,
      status,
      clientType: clientType || null,
      location: location || null,
      businessEmail: businessEmail || null,
      state: state || null,
      city: city || null,
      channelPartnerId: channelPartnerId || null,
      roleDescription: roleDescription || null,
      employeeCount: employeeCount || null,
      extra: extra || null,
    });

    // Auto-provision an admin user for OTP login using the provided phone (if any)
    try {
      const normalizedPhone = phone ? String(phone).replace(/[^0-9]/g, '').slice(-10) : null;
      if (normalizedPhone) {
        let admin = await User.findOne({ where: { phone: String(normalizedPhone) } });
        if (!admin) {
          const hash = await bcrypt.hash('123456', 10);
          admin = await User.create({ role: 'admin', orgAccountId: row.id, phone: String(normalizedPhone), passwordHash: hash, active: true });
        } else {
          // Ensure user is linked to this org and active
          await admin.update({ orgAccountId: row.id, role: 'admin', active: true });
        }
      }
    } catch (_) {}
    return res.json({ success: true, client: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

router.put('/clients/:id', async (req, res) => {
  try {
    const row = await OrgAccount.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, phone, status, clientType, location, extra, businessEmail, state, city, channelPartnerId, roleDescription, employeeCount } = req.body || {};
    await row.update({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(clientType !== undefined ? { clientType } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(businessEmail !== undefined ? { businessEmail } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(channelPartnerId !== undefined ? { channelPartnerId } : {}),
      ...(roleDescription !== undefined ? { roleDescription } : {}),
      ...(employeeCount !== undefined ? { employeeCount } : {}),
      ...(extra !== undefined ? { extra } : {}),
    });
    return res.json({ success: true, client: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

// Assign/Renew subscription
router.post('/clients/:id/subscription', async (req, res) => {
  try {
    const orgAccountId = Number(req.params.id);
    const org = await OrgAccount.findByPk(orgAccountId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const { planId, planCode, startAt, staffLimit } = req.body || {};
    let plan = null;
    if (planId) plan = await Plan.findByPk(planId);
    if (!plan && planCode) plan = await Plan.findOne({ where: { code: String(planCode).toUpperCase() } });
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const start = startAt ? new Date(startAt) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + Number(plan.periodDays || 0));

    const sub = await Subscription.create({
      orgAccountId: org.id,
      planId: plan.id,
      startAt: start,
      endAt: end,
      status: 'ACTIVE',
      ...(staffLimit !== undefined && staffLimit !== null ? { staffLimit: Number(staffLimit) } : {}),
    });

    await org.update({ status: 'ACTIVE' });

    // Ensure there is an admin user tied to this organization (using org.phone)
    try {
      const normalizedPhone = org.phone ? String(org.phone).replace(/[^0-9]/g, '').slice(-10) : null;
      if (normalizedPhone) {
        let admin = await User.findOne({ where: { phone: String(normalizedPhone) } });
        if (!admin) {
          const hash = await bcrypt.hash('123456', 10);
          admin = await User.create({ role: 'admin', orgAccountId: org.id, phone: String(normalizedPhone), passwordHash: hash, active: true });
        } else {
          await admin.update({ orgAccountId: org.id, role: 'admin', active: true });
        }
      }
    } catch (_) {}

    return res.json({ success: true, subscription: sub, plan });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign subscription' });
  }
});

// Superadmin Dashboard metrics
router.get('/dashboard', async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const orgs = await OrgAccount.findAll();
    let active = 0, disabled = 0, suspended = 0, expired = 0;
    for (const org of orgs) {
      if (org.status === 'ACTIVE') active += 1;
      else if (org.status === 'DISABLED') disabled += 1;
      else if (org.status === 'SUSPENDED') suspended += 1;
      try {
        const sub = await Subscription.findOne({ where: { orgAccountId: org.id, status: 'ACTIVE' }, order: [['endAt','DESC']] });
        if (!sub || new Date(sub.endAt) < now) expired += 1;
      } catch (_) {}
    }

    const subsMonth = await Subscription.findAll({ where: { startAt: { [Op.gte]: startOfMonth } }, include: [{ model: Plan, as: 'plan' }] });
    const subsYear = await Subscription.findAll({ where: { startAt: { [Op.gte]: startOfYear } }, include: [{ model: Plan, as: 'plan' }] });
    const sumPrice = (rows) => rows.reduce((s, r) => s + Number(r.plan?.price || 0), 0);
    const revenue = { month: sumPrice(subsMonth), year: sumPrice(subsYear) };

    const growth = [];
    for (let i = 11; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = orgs.filter(o => new Date(o.createdAt) >= from && new Date(o.createdAt) < to).length;
      growth.push({ month: `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}`, clients: count });
    }

    return res.json({ success: true, counts: { active, disabled, suspended, expired }, revenue, growth });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

module.exports = router;