const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { sequelize } = require('../sequelize');
const { Plan, OrgAccount, Subscription, User, Permission, Role, StaffProfile, ChannelPartner } = require('../models');
const bcrypt = require('bcryptjs');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { Op } = require('sequelize');

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function validateChannelPartnerMapping({ phone, channelPartnerId }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return;

  const partner = await ChannelPartner.findOne({ where: { phone: String(normalizedPhone) } });
  if (!partner) return;

  const providedId = String(channelPartnerId || '').trim();
  if (!providedId || providedId !== String(partner.channelPartnerId || '')) {
    const err = new Error(`Channel Partner ID required for phone ${normalizedPhone}. Use ID ${partner.channelPartnerId}.`);
    err.statusCode = 400;
    throw err;
  }
}

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
    const {
      code, name, periodDays, price, features, active,
      expenseEnabled, payrollEnabled, performanceEnabled, aiReportsEnabled, aiAssistantEnabled, taskManagementEnabled,
      rosterEnabled, recruitmentEnabled, communityEnabled
    } = req.body || {};
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
      payrollEnabled: !!payrollEnabled,
      performanceEnabled: !!performanceEnabled,
      aiReportsEnabled: !!aiReportsEnabled,
      aiAssistantEnabled: !!aiAssistantEnabled,
      taskManagementEnabled: !!taskManagementEnabled,
      rosterEnabled: !!rosterEnabled,
      recruitmentEnabled: !!recruitmentEnabled,
      communityEnabled: !!communityEnabled,
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
    const {
      code, name, periodDays, price, features, active,
      expenseEnabled, payrollEnabled, performanceEnabled, aiReportsEnabled, aiAssistantEnabled, taskManagementEnabled,
      rosterEnabled, recruitmentEnabled, communityEnabled
    } = req.body || {};
    await row.update({
      ...(code !== undefined ? { code: String(code).toUpperCase() } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(periodDays !== undefined ? { periodDays: Number(periodDays) } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(features !== undefined ? { features } : {}),
      ...(active !== undefined ? { active: !!active } : {}),
      ...(expenseEnabled !== undefined ? { expenseEnabled: !!expenseEnabled } : {}),
      ...(payrollEnabled !== undefined ? { payrollEnabled: !!payrollEnabled } : {}),
      ...(performanceEnabled !== undefined ? { performanceEnabled: !!performanceEnabled } : {}),
      ...(aiReportsEnabled !== undefined ? { aiReportsEnabled: !!aiReportsEnabled } : {}),
      ...(aiAssistantEnabled !== undefined ? { aiAssistantEnabled: !!aiAssistantEnabled } : {}),
      ...(taskManagementEnabled !== undefined ? { taskManagementEnabled: !!taskManagementEnabled } : {}),
      ...(rosterEnabled !== undefined ? { rosterEnabled: !!rosterEnabled } : {}),
      ...(recruitmentEnabled !== undefined ? { recruitmentEnabled: !!recruitmentEnabled } : {}),
      ...(communityEnabled !== undefined ? { communityEnabled: !!communityEnabled } : {}),
    });
    return res.json({ success: true, plan: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update plan' });
  }
});

// Channel Partners
router.get('/channel-partners', async (_req, res) => {
  try {
    const rows = await ChannelPartner.findAll({ order: [['createdAt', 'DESC']] });
    return res.json({ success: true, channelPartners: rows });
  } catch (_) {
    return res.status(500).json({ success: false, message: 'Failed to load channel partners' });
  }
});

router.post('/channel-partners', async (req, res) => {
  try {
    const {
      name,
      channelPartnerId,
      phone,
      status = 'ACTIVE',
      clientType,
      location,
      extra,
      businessEmail,
      state,
      city,
      roleDescription,
      employeeCount,
      contactPersonName,
      address,
      birthDate,
      anniversaryDate,
      gstNumber
    } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    if (!channelPartnerId) return res.status(400).json({ success: false, message: 'channelPartnerId required' });

    const normalizedPartnerId = String(channelPartnerId || '').trim();
    const partnerIdExists = await ChannelPartner.findOne({ where: { channelPartnerId: normalizedPartnerId } });
    if (partnerIdExists) {
      return res.status(400).json({ success: false, message: 'Channel Partner ID already exists' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone) {
      const exists = await ChannelPartner.findOne({ where: { phone: String(normalizedPhone) } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Phone already linked to another channel partner' });
      }
    }

    const row = await ChannelPartner.create({
      name,
      channelPartnerId: normalizedPartnerId,
      phone: normalizedPhone || null,
      status,
      clientType: clientType || null,
      location: location || null,
      businessEmail: businessEmail || null,
      state: state || null,
      city: city || null,
      roleDescription: roleDescription || null,
      employeeCount: employeeCount || null,
      contactPersonName: contactPersonName || null,
      address: address || null,
      birthDate: birthDate || null,
      anniversaryDate: anniversaryDate || null,
      gstNumber: gstNumber || null,
      extra: extra || null,
    });

    // Sync with User table
    if (normalizedPhone) {
      let user = await User.findOne({ where: { phone: String(normalizedPhone) } });
      if (!user) {
        const hash = await bcrypt.hash('123456', 10);
        await User.create({
          role: 'channel_partner',
          phone: String(normalizedPhone),
          passwordHash: hash,
          channelPartnerId: normalizedPartnerId,
          active: true
        });
      } else {
        // Link existing user to this partner ID
        await user.update({ channelPartnerId: normalizedPartnerId });
      }
    }

    return res.json({ success: true, channelPartner: row });
  } catch (_) {
    return res.status(500).json({ success: false, message: 'Failed to create channel partner' });
  }
});

router.put('/channel-partners/:id', async (req, res) => {
  try {
    const row = await ChannelPartner.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      name,
      channelPartnerId,
      phone,
      status,
      clientType,
      location,
      extra,
      businessEmail,
      state,
      city,
      roleDescription,
      employeeCount,
      contactPersonName,
      address,
      birthDate,
      anniversaryDate,
      gstNumber
    } = req.body || {};

    if (phone !== undefined) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone) {
        const exists = await ChannelPartner.findOne({
          where: { phone: String(normalizedPhone), id: { [Op.ne]: row.id } }
        });
        if (exists) {
          return res.status(400).json({ success: false, message: 'Phone already linked to another channel partner' });
        }
      }
    }

    if (channelPartnerId !== undefined) {
      const normalizedPartnerId = String(channelPartnerId || '').trim();
      if (!normalizedPartnerId) {
        return res.status(400).json({ success: false, message: 'channelPartnerId required' });
      }
      const exists = await ChannelPartner.findOne({
        where: { channelPartnerId: normalizedPartnerId, id: { [Op.ne]: row.id } }
      });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Channel Partner ID already exists' });
      }
    }

    await row.update({
      ...(name !== undefined ? { name } : {}),
      ...(channelPartnerId !== undefined ? { channelPartnerId: String(channelPartnerId || '').trim() } : {}),
      ...(phone !== undefined ? { phone: normalizePhone(phone) || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(clientType !== undefined ? { clientType } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(businessEmail !== undefined ? { businessEmail } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(roleDescription !== undefined ? { roleDescription } : {}),
      ...(employeeCount !== undefined ? { employeeCount } : {}),
      ...(contactPersonName !== undefined ? { contactPersonName } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(birthDate !== undefined ? { birthDate } : {}),
      ...(anniversaryDate !== undefined ? { anniversaryDate } : {}),
      ...(gstNumber !== undefined ? { gstNumber } : {}),
      ...(extra !== undefined ? { extra } : {}),
    });

    // Sync with User table on update
    const finalPhone = normalizePhone(phone || row.phone);
    const finalPartnerId = String(channelPartnerId || row.channelPartnerId).trim();

    if (finalPhone) {
      let user = await User.findOne({ where: { phone: String(finalPhone) } });
      if (user) {
        await user.update({ channelPartnerId: finalPartnerId });
      } else {
        const hash = await bcrypt.hash('123456', 10);
        await User.create({
          role: 'channel_partner',
          phone: String(finalPhone),
          passwordHash: hash,
          channelPartnerId: finalPartnerId,
          active: true
        });
      }
    }

    return res.json({ success: true, channelPartner: row });
  } catch (_) {
    return res.status(500).json({ success: false, message: 'Failed to update channel partner' });
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
        if (org.status !== targetStatus && org.status !== 'SUSPENDED') {
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
    const {
      name, phone, status = 'ACTIVE', clientType, location, extra, businessEmail, state, city,
      channelPartnerId, roleDescription, employeeCount,
      contactPersonName, address, birthDate, anniversaryDate, gstNumber
    } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });

    // Check if phone number already exists in either OrgAccount or User table
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone) {
      const existingOrg = await OrgAccount.findOne({ where: { phone: normalizedPhone } });
      const existingUser = await User.findOne({ where: { phone: String(normalizedPhone) } });

      if (existingOrg || existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists in the system'
        });
      }
    }

    await validateChannelPartnerMapping({ phone: normalizedPhone, channelPartnerId });

    const row = await OrgAccount.create({
      name,
      phone: normalizedPhone || null,
      status,
      clientType: clientType || null,
      location: location || null,
      businessEmail: businessEmail || null,
      state: state || null,
      city: city || null,
      channelPartnerId: channelPartnerId || null,
      roleDescription: roleDescription || null,
      employeeCount: employeeCount || null,
      contactPersonName: contactPersonName || null,
      address: address || null,
      birthDate: birthDate || null,
      anniversaryDate: anniversaryDate || null,
      gstNumber: gstNumber || null,
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
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ success: false, message: e.message || 'Validation failed' });
    }
    return res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

router.put('/clients/:id', async (req, res) => {
  try {
    const row = await OrgAccount.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const {
      name, phone, status, clientType, location, extra, businessEmail, state, city,
      channelPartnerId, roleDescription, employeeCount,
      contactPersonName, address, birthDate, anniversaryDate, gstNumber
    } = req.body || {};

    // Check if phone number already exists in either OrgAccount or User table (excluding current client)
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone) {
      const existingOrg = await OrgAccount.findOne({
        where: {
          phone: normalizedPhone,
          id: { [Op.ne]: row.id } // Exclude current client
        }
      });
      const existingUser = await User.findOne({ where: { phone: String(normalizedPhone) } });

      // Allow if same phone belongs to this client's own user (e.g., org admin created for this client)
      const isUserFromSameClient = !!existingUser && Number(existingUser.orgAccountId || 0) === Number(row.id);

      if (existingOrg || (existingUser && !isUserFromSameClient)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists in the system'
        });
      }
    }

    if (phone !== undefined) {
      await validateChannelPartnerMapping({ phone: normalizedPhone, channelPartnerId });
    }

    await row.update({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone: normalizedPhone || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(clientType !== undefined ? { clientType } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(businessEmail !== undefined ? { businessEmail } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(city !== undefined ? { city } : {}),
      channelPartnerId: channelPartnerId !== undefined ? channelPartnerId : row.channelPartnerId,
      roleDescription: roleDescription !== undefined ? roleDescription : row.roleDescription,
      employeeCount: employeeCount !== undefined ? employeeCount : row.employeeCount,
      contactPersonName: contactPersonName !== undefined ? contactPersonName : row.contactPersonName,
      address: address !== undefined ? address : row.address,
      birthDate: birthDate !== undefined ? birthDate : row.birthDate,
      anniversaryDate: anniversaryDate !== undefined ? anniversaryDate : row.anniversaryDate,
      gstNumber: gstNumber !== undefined ? gstNumber : row.gstNumber,
      extra: extra !== undefined ? extra : row.extra,
    });
    return res.json({ success: true, client: row });
  } catch (e) {
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ success: false, message: e.message || 'Validation failed' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

// Assign/Renew subscription
router.post('/clients/:id/subscription', async (req, res) => {
  try {
    const orgAccountId = Number(req.params.id);
    const org = await OrgAccount.findByPk(orgAccountId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const {
      planId, planCode, startAt, staffLimit, maxGeolocationStaff,
      salesEnabled, geolocationEnabled, expenseEnabled,
      payrollEnabled, performanceEnabled, aiReportsEnabled, aiAssistantEnabled, taskManagementEnabled,
      rosterEnabled, recruitmentEnabled, communityEnabled
    } = req.body || {};

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
        if (payrollEnabled !== undefined && !!payrollEnabled !== existingSubscription.payrollEnabled) {
          updateData.payrollEnabled = !!payrollEnabled;
          messageArr.push(`Payroll module ${payrollEnabled ? 'enabled' : 'disabled'}`);
        }
        if (performanceEnabled !== undefined && !!performanceEnabled !== existingSubscription.performanceEnabled) {
          updateData.performanceEnabled = !!performanceEnabled;
          messageArr.push(`Performance module ${performanceEnabled ? 'enabled' : 'disabled'}`);
        }
        if (aiReportsEnabled !== undefined && !!aiReportsEnabled !== existingSubscription.aiReportsEnabled) {
          updateData.aiReportsEnabled = !!aiReportsEnabled;
          messageArr.push(`AI Reports module ${aiReportsEnabled ? 'enabled' : 'disabled'}`);
        }
        if (aiAssistantEnabled !== undefined && !!aiAssistantEnabled !== existingSubscription.aiAssistantEnabled) {
          updateData.aiAssistantEnabled = !!aiAssistantEnabled;
          messageArr.push(`AI Assistant module ${aiAssistantEnabled ? 'enabled' : 'disabled'}`);
        }
        if (taskManagementEnabled !== undefined && !!taskManagementEnabled !== existingSubscription.taskManagementEnabled) {
          updateData.taskManagementEnabled = !!taskManagementEnabled;
          messageArr.push(`Task Management module ${taskManagementEnabled ? 'enabled' : 'disabled'}`);
        }
        if (rosterEnabled !== undefined && !!rosterEnabled !== existingSubscription.rosterEnabled) {
          updateData.rosterEnabled = !!rosterEnabled;
          messageArr.push(`Roster module ${rosterEnabled ? 'enabled' : 'disabled'}`);
        }
        if (recruitmentEnabled !== undefined && !!recruitmentEnabled !== existingSubscription.recruitmentEnabled) {
          updateData.recruitmentEnabled = !!recruitmentEnabled;
          messageArr.push(`Recruitment module ${recruitmentEnabled ? 'enabled' : 'disabled'}`);
        }
        if (communityEnabled !== undefined && !!communityEnabled !== existingSubscription.communityEnabled) {
          updateData.communityEnabled = !!communityEnabled;
          messageArr.push(`Community module ${communityEnabled ? 'enabled' : 'disabled'}`);
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
      expenseEnabled,
      payrollEnabled,
      performanceEnabled,
      aiReportsEnabled,
      aiAssistantEnabled,
      taskManagementEnabled,
      rosterEnabled,
      recruitmentEnabled,
      communityEnabled
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
      payrollEnabled: payrollEnabled !== undefined ? !!payrollEnabled : (plan.payrollEnabled || false),
      performanceEnabled: performanceEnabled !== undefined ? !!performanceEnabled : (plan.performanceEnabled || false),
      aiReportsEnabled: aiReportsEnabled !== undefined ? !!aiReportsEnabled : (plan.aiReportsEnabled || false),
      aiAssistantEnabled: aiAssistantEnabled !== undefined ? !!aiAssistantEnabled : (plan.aiAssistantEnabled || false),
      taskManagementEnabled: taskManagementEnabled !== undefined ? !!taskManagementEnabled : (plan.taskManagementEnabled || false),
      rosterEnabled: rosterEnabled !== undefined ? !!rosterEnabled : (plan.rosterEnabled || false),
      recruitmentEnabled: recruitmentEnabled !== undefined ? !!recruitmentEnabled : (plan.recruitmentEnabled || false),
      communityEnabled: communityEnabled !== undefined ? !!communityEnabled : (plan.communityEnabled || false),
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
                loginURL: 'https://web.vetansutra.com',
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
                loginURL: 'https://web.vetansutra.com',
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
    return res.status(500).json({ success: false, message: 'Impersonation failed' });
  }
});

// Toggle Client Status
router.post('/clients/:id/toggle-status', async (req, res) => {
  try {
    const org = await OrgAccount.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Client not found' });

    let newStatus;
    if (org.status === 'SUSPENDED') {
      // Re-activate: calculate what status it SHOULD have based on subscription
      const sub = await Subscription.findOne({
        where: { orgAccountId: org.id, status: 'ACTIVE' },
        order: [['endAt', 'DESC']]
      });
      const now = new Date();
      newStatus = (sub && new Date(sub.endAt) >= now) ? 'ACTIVE' : 'DISABLED';
    } else {
      // Deactivate
      newStatus = 'SUSPENDED';
    }

    await org.update({ status: newStatus });
    return res.json({ success: true, status: newStatus });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to toggle status' });
  }
});

module.exports = router;
