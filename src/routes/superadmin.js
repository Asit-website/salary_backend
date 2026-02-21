const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { sequelize } = require('../sequelize');
const { Plan, OrgAccount, Subscription, User, Permission, Role, StaffProfile } = require('../models');
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
    const { code, name, periodDays, price, features, active, expenseEnabled } = req.body || {};
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
      expenseEnabled: !!expenseEnabled,
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
    const { code, name, periodDays, price, features, active, expenseEnabled } = req.body || {};
    await row.update({
      ...(code !== undefined ? { code: String(code).toUpperCase() } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(periodDays !== undefined ? { periodDays: Number(periodDays) } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(features !== undefined ? { features } : {}),
      ...(active !== undefined ? { active: !!active } : {}),
      ...(expenseEnabled !== undefined ? { expenseEnabled: !!expenseEnabled } : {}),
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
          order: [['endAt', 'DESC'], ['updatedAt', 'DESC']],
          include: [{ model: Plan, as: 'plan' }]
        });
        const shouldBeActive = !!(sub && new Date(sub.endAt) >= now);
        const targetStatus = shouldBeActive ? 'ACTIVE' : 'DISABLED';
        if (org.status !== targetStatus) {
          await org.update({ status: targetStatus });
        }
        // Add subscription data to org object
        org.dataValues.currentSubscription = sub;
        org.dataValues.plan = sub?.plan || null;
      } catch (_) { }
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
      order: [['endAt', 'DESC'], ['updatedAt', 'DESC']]
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
        features: (() => {
          const features = subscription.plan?.features || [];
          if (Array.isArray(features)) return features;
          if (typeof features === 'string') {
            try {
              return JSON.parse(features);
            } catch {
              return [];
            }
          }
          return [];
        })()
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

    // Check if phone number already exists in either OrgAccount or User table
    if (phone) {
      const normalizedPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
      const existingOrg = await OrgAccount.findOne({ where: { phone: normalizedPhone } });
      const existingUser = await User.findOne({ where: { phone: String(normalizedPhone) } });

      if (existingOrg || existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists in the system'
        });
      }
    }

    const row = await OrgAccount.create({
      name,
      phone: phone ? String(phone).replace(/[^0-9]/g, '').slice(-10) : null,
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

          // Send admin signup review email to business email when admin is created
          if (businessEmail) {
            try {
              const { sendAdminSignupReviewEmail } = require('../services/emailService');
              await sendAdminSignupReviewEmail(businessEmail, name || 'Admin');
            } catch (emailError) {
              console.error('Failed to send admin signup review email:', emailError);
            }
          }
        } else {
          // Ensure user is linked to this org and active
          await admin.update({ orgAccountId: row.id, role: 'admin', active: true });
        }
      }
    } catch (_) { }
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

    // Check if phone number already exists in either OrgAccount or User table (excluding current client)
    if (phone) {
      const normalizedPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
      const existingOrg = await OrgAccount.findOne({
        where: {
          phone: normalizedPhone,
          id: { [Op.ne]: req.params.id } // Exclude current client
        }
      });
      const existingUser = await User.findOne({ where: { phone: String(normalizedPhone) } });

      if (existingOrg || existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists in the system'
        });
      }
    }

    await row.update({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone: phone ? String(phone).replace(/[^0-9]/g, '').slice(-10) : null } : {}),
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

    const { planId, planCode, startAt, staffLimit, maxGeolocationStaff, salesEnabled, geolocationEnabled, expenseEnabled } = req.body || {};

    // Check if client has an active subscription that hasn't expired
    const existingSubscription = await Subscription.findOne({
      where: { orgAccountId: org.id, status: 'ACTIVE' },
      order: [['endAt', 'DESC'], ['updatedAt', 'DESC']]
    });

    // Allow limit and feature updates even if subscription hasn't expired
    if (existingSubscription && new Date(existingSubscription.endAt) > new Date()) {
      // If updating limits or feature toggles on the SAME plan
      const isUpdatingCurrentPlan = !planId || planId == existingSubscription.planId;

      if (isUpdatingCurrentPlan) {
        const updateData = {};
        let messageArr = [];

        // Check if Start Date is being updated
        if (startAt) {
          const newStart = new Date(startAt);
          const oldStart = new Date(existingSubscription.startAt);

          console.log('--- DATE DEBUG ---');
          console.log('Incoming startAt:', startAt);
          console.log('Parsed New Start:', newStart.toString());
          console.log('Old Start:', oldStart.toString());

          // Check if difference is significant (e.g. > 12 hours to ignore minor timezone drifts)
          const diff = Math.abs(newStart.getTime() - oldStart.getTime());
          console.log('Diff (ms):', diff);
          console.log('Threshold:', 1000 * 60 * 60 * 12);

          if (diff > 1000 * 60 * 60 * 12) {
            // Date has changed. We need to update Start AND End date.
            // We need to fetch the plan to know the duration
            const currentPlan = await Plan.findByPk(existingSubscription.planId);
            if (currentPlan) {
              const newEnd = new Date(newStart);
              newEnd.setDate(newEnd.getDate() + Number(currentPlan.periodDays || 0));

              updateData.startAt = newStart;
              updateData.endAt = newEnd;
              messageArr.push(`Subscription period updated (${newStart.toLocaleDateString()} - ${newEnd.toLocaleDateString()})`);
            }
          }
        }

        if (staffLimit !== undefined && staffLimit !== null && Number(staffLimit) !== existingSubscription.staffLimit) {
          updateData.staffLimit = Number(staffLimit);
          messageArr.push('Staff limit updated');
        }

        if (maxGeolocationStaff !== undefined && maxGeolocationStaff !== null && Number(maxGeolocationStaff) !== existingSubscription.maxGeolocationStaff) {
          updateData.maxGeolocationStaff = Number(maxGeolocationStaff);
          messageArr.push('Max geolocation staff updated');
        }

        if (salesEnabled !== undefined && !!salesEnabled !== existingSubscription.salesEnabled) {
          updateData.salesEnabled = !!salesEnabled;
          messageArr.push(`Sales module ${salesEnabled ? 'enabled' : 'disabled'}`);
        }

        if (geolocationEnabled !== undefined && !!geolocationEnabled !== existingSubscription.geolocationEnabled) {
          updateData.geolocationEnabled = !!geolocationEnabled;
          messageArr.push(`Geolocation module ${geolocationEnabled ? 'enabled' : 'disabled'}`);
        }

        if (expenseEnabled !== undefined && !!expenseEnabled !== existingSubscription.expenseEnabled) {
          updateData.expenseEnabled = !!expenseEnabled;
          messageArr.push(`Expense module ${expenseEnabled ? 'enabled' : 'disabled'}`);
        }

        if (Object.keys(updateData).length > 0) {
          await existingSubscription.update(updateData);
          return res.json({ success: true, message: messageArr.join(', '), subscription: existingSubscription });
        } else {
          // If no changes were actually made but it was a valid check, just return current
          return res.json({ success: true, message: 'Current subscription remains unchanged', subscription: existingSubscription });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Your old subscription is not expired yet. You can only increase staff limit or toggle features until it expires.'
        });
      }
    }

    let plan = null;
    if (planId) plan = await Plan.findByPk(planId);
    if (!plan && planCode) plan = await Plan.findOne({ where: { code: String(planCode).toUpperCase() } });
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const start = startAt ? new Date(startAt) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + Number(plan.periodDays || 0));

    console.log('Final subscription data:', {
      orgAccountId: org.id,
      planId: plan.id,
      staffLimit,
      maxGeolocationStaff,
      salesEnabled,
      geolocationEnabled,
      expenseEnabled
    });

    const sub = await Subscription.create({
      orgAccountId: org.id,
      planId: plan.id,
      startAt: start,
      endAt: end,
      status: 'ACTIVE',
      staffLimit: staffLimit !== undefined && staffLimit !== null ? Number(staffLimit) : (plan.staffLimit || 0),
      maxGeolocationStaff: maxGeolocationStaff !== undefined && maxGeolocationStaff !== null ? Number(maxGeolocationStaff) : (plan.maxGeolocationStaff || 0),
      salesEnabled: salesEnabled !== undefined ? !!salesEnabled : (plan.salesEnabled || false),
      geolocationEnabled: geolocationEnabled !== undefined ? !!geolocationEnabled : (plan.geolocationEnabled || false),
      expenseEnabled: expenseEnabled !== undefined ? !!expenseEnabled : (plan.expenseEnabled || false),
    });
    console.log('Subscription created successfully:', sub.id);

    await org.update({ status: 'ACTIVE' });
    console.log('Organization status updated to ACTIVE');

    // Ensure there is an admin user tied to this organization (using org.phone)
    try {
      const normalizedPhone = org.phone ? String(org.phone).replace(/[^0-9]/g, '').slice(-10) : null;
      if (normalizedPhone) {
        let admin = await User.findOne({ where: { phone: String(normalizedPhone) } });
        if (!admin) {
          const hash = await bcrypt.hash('123456', 10);
          admin = await User.create({ role: 'admin', orgAccountId: org.id, phone: String(normalizedPhone), passwordHash: hash, active: true });

          // Send account activation email to business email when admin is created
          if (org.businessEmail) {
            try {
              const { sendAccountActivationEmail } = require('../services/emailService');
              await sendAccountActivationEmail(org.businessEmail, org.name || 'Admin', org.name || 'Organization', {
                loginURL: 'http://localhost:3000',
                planType: plan?.name || 'Basic',
                expiryDate: end ? new Date(end).toLocaleDateString() : 'N/A',
                userLimit: staffLimit || 'N/A'
              });
            } catch (emailError) {
              console.error('Failed to send activation email:', emailError);
            }
          }
        } else {
          await admin.update({ orgAccountId: org.id, role: 'admin', active: true });

          // Send account activation email to business email for existing admin
          if (org.businessEmail) {
            try {
              const { sendAccountActivationEmail } = require('../services/emailService');
              await sendAccountActivationEmail(org.businessEmail, org.name || 'Admin', org.name || 'Organization', {
                loginURL: 'http://localhost:3000',
                planType: plan?.name || 'Basic',
                expiryDate: end ? new Date(end).toLocaleDateString() : 'N/A',
                userLimit: staffLimit || 'N/A'
              });
            } catch (emailError) {
              console.error('Failed to send activation email:', emailError);
            }
          }
        }
      }
    } catch (_) { }

    return res.json({ success: true, subscription: sub, plan });
  } catch (e) {
    console.error('Subscription assignment error:', e);
    return res.status(500).json({ success: false, message: 'Failed to assign subscription: ' + e.message });
  }
});

// Get staff count for a client
router.get('/client/:id/staff-count', async (req, res) => {
  try {
    const clientId = req.params.id;

    // Count staff users for this organization
    const staffCount = await User.count({
      where: {
        orgAccountId: clientId,
        role: 'staff',
        active: true
      }
    });

    return res.json({ success: true, count: staffCount });
  } catch (e) {
    console.error('Failed to get staff count:', e);
    return res.status(500).json({ success: false, message: 'Failed to get staff count' });
  }
});

const { runSubscriptionExpiryCheck } = require('../jobs');

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
        const sub = await Subscription.findOne({ where: { orgAccountId: org.id, status: 'ACTIVE' }, order: [['endAt', 'DESC']] });
        if (!sub || new Date(sub.endAt) < now) expired += 1;
      } catch (_) { }
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
      growth.push({ month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`, clients: count });
    }

    return res.json({ success: true, counts: { active, disabled, suspended, expired }, revenue, growth });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

// Manually trigger subscription expiry reminder check
router.post('/subscription-expiry-reminder-check', async (_req, res) => {
  try {
    await runSubscriptionExpiryCheck();
    return res.json({ success: true, message: 'Subscription expiry reminder check completed' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to run reminder check' });
  }
});

// Get geolocation staff count for a client
router.get('/client/:id/geo-staff-count', async (req, res) => {
  try {
    const clientId = req.params.id;

    // Directly query the users table for staff with geolocation access
    const [results] = await sequelize.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.org_account_id = :clientId
      AND u.role = 'staff'
      AND u.active = 1
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = u.id
        AND p.name = 'geolocation_access'
      )
    `, {
      replacements: { clientId },
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({ success: true, count: results ? results.count : 0 });
  } catch (e) {
    console.error('Failed to get geolocation staff count:', e);
    return res.status(500).json({ success: false, message: 'Failed to get geolocation staff count' });
  }
});

// Impersonate: login as client's admin
router.post('/clients/:id/impersonate', async (req, res) => {
  try {
    const orgAccountId = Number(req.params.id);
    const org = await OrgAccount.findByPk(orgAccountId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Find the admin user for this org
    const admin = await User.findOne({
      where: { orgAccountId: org.id, role: 'admin', active: true }
    });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'No admin user found for this organization' });
    }

    const profile = await StaffProfile.findOne({ where: { userId: admin.id } });
    const name = profile?.name || org.name || null;

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign(
      { id: admin.id, role: admin.role, phone: admin.phone, name },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: admin.id, role: admin.role, phone: admin.phone, name },
    });
  } catch (e) {
    console.error('Impersonate error:', e);
    return res.status(500).json({ success: false, message: 'Failed to impersonate' });
  }
});

module.exports = router;