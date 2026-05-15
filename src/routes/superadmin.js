const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { sequelize } = require('../sequelize');
const { Plan, OrgAccount, Subscription, User, Permission, Role, StaffProfile, ChannelPartner, Lead, LeadConfig } = require('../models');
const bcrypt = require('bcryptjs');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { Op } = require('sequelize');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage() });

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
router.use((req, res, next) => {
  // Parse permissions robustly
  let perms = req.user.permissions;
  let safety = 0;
  while (typeof perms === 'string' && safety < 5) {
    try {
      const parsed = JSON.parse(perms);
      if (parsed === perms) break;
      perms = parsed;
    } catch (e) { break; }
    safety++;
  }
  req.user.permissions = perms || {};

  const superAllowedPaths = [
    '/leads',
    '/staff',
    '/clients',
    '/client/',
    '/channel-partners',
    '/dashboard',
    '/plans'
  ];

  if (superAllowedPaths.some(p => req.path.startsWith(p))) {
    const hasSuperAccess = req.user.role === 'superadmin' || req.user.permissions.superadmin_access === true;
    if (hasSuperAccess) return next();
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return requireRole(['superadmin'])(req, res, next);
});

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
router.get('/channel-partners', async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.partners === 'manage_own') {
        where = { createdBy: user.id };
      }
    }

    const rows = await ChannelPartner.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, channelPartners: rows });
  } catch (_) {
    return res.status(500).json({ success: false, message: 'Failed to load channel partners' });
  }
});

router.post('/channel-partners', async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
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
      gstNumber,
      createdBy
    } = data;
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
      createdBy: createdBy || null,
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
    const user = req.user;
    const row = await ChannelPartner.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    // Permission check
    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.partners === 'manage_own' && row.createdBy !== user.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
    }

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
router.get('/clients', async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.clients === 'manage_own') {
        where = { createdBy: user.id };
      } else if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients : [];
        where = { id: { [Op.in]: selectedIds } };
      }
    }

    const { User, Subscription, Plan, Role, Permission } = require('../models');
    const allOrgs = await OrgAccount.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'role', 'orgAccountId']
      }],
      order: [['createdAt', 'ASC']]
    });
    const now = new Date();

    // Group organizations by Root Owner Phone to identify parent/children
    const rootGroups = {}; // rootPhone -> OrgAccount[]
    const userToRootPhone = {}; // userId -> rootPhone

    for (const org of allOrgs) {
      let rootPhone = org.phone;

      // 1. If creator is known, try to find their root phone
      if (org.createdBy && !userToRootPhone[org.createdBy]) {
        try {
          const creator = await User.findByPk(org.createdBy);
          if (creator) {
            // Find the oldest admin record for this person's phone
            const firstAdmin = await User.findOne({ 
              where: { phone: creator.phone, role: 'admin' }, 
              order: [['id', 'ASC']] 
            });
            if (firstAdmin) {
              const rootOrg = await OrgAccount.findByPk(firstAdmin.orgAccountId);
              if (rootOrg) rootPhone = rootOrg.phone;
            }
          }
          userToRootPhone[org.createdBy] = rootPhone;
        } catch (e) { console.error('Grouping logic error:', e); }
      } else if (org.createdBy) {
        rootPhone = userToRootPhone[org.createdBy];
      }

      // 2. Cross-link via Admin Phone (if phone itself is an admin in another org)
      if (rootPhone) {
        const adminCheck = await User.findOne({ 
          where: { phone: rootPhone, role: 'admin' }, 
          order: [['id', 'ASC']] 
        });
        if (adminCheck && adminCheck.orgAccountId) {
           const adminOrg = await OrgAccount.findByPk(adminCheck.orgAccountId);
           if (adminOrg && adminOrg.phone) rootPhone = adminOrg.phone;
        }
      }

      // Fallback: If no root phone found yet, use current org phone
      const groupKey = rootPhone || `no-identity-${org.id}`;

      if (!rootGroups[groupKey]) rootGroups[groupKey] = [];
      rootGroups[groupKey].push(org);
    }

    const geoPermission = await Permission.findOne({ where: { name: 'geolocation_access' } });
    const finalClients = [];

    for (const ph in rootGroups) {
      const groupOrgs = rootGroups[ph];
      const parentOrg = groupOrgs[0]; // Oldest is the parent
      const childrenOrgs = groupOrgs.slice(1);
      const linkedOrgIds = groupOrgs.map(o => o.id);

      // 1. Get Effective Subscription from Parent
      const effectiveSub = await Subscription.findOne({
        where: { orgAccountId: parentOrg.id, status: 'ACTIVE' },
        order: [['endAt', 'DESC'], ['updatedAt', 'DESC']],
        include: [{ model: Plan, as: 'plan' }]
      });

      // 2. Calculate Shared Staff Counts with breakdown
      const staffBreakdown = [];
      let totalStaffCount = 0;
      let totalGeoStaffCount = 0;

      for (const org of groupOrgs) {
        // Active staff for THIS specific org
        const orgStaffCount = await User.count({
          where: {
            phone: { [Op.ne]: String(ph) },
            role: 'staff',
            active: true,
            orgAccountId: org.id
          }
        });

        // Geo staff for THIS specific org
        let orgGeoCount = 0;
        if (geoPermission) {
          const geoUsers = await User.findAll({
            where: {
              role: 'staff',
              active: true,
              orgAccountId: org.id
            },
            include: [{
              model: Role,
              as: 'roles',
              required: true,
              include: [{
                model: Permission,
                as: 'permissions',
                where: { id: geoPermission.id },
                required: true
              }]
            }]
          });
          orgGeoCount = geoUsers.length;
        }

        if (orgStaffCount > 0 || orgGeoCount > 0 || org.id !== parentOrg.id) {
          staffBreakdown.push({
            orgId: org.id,
            name: org.name,
            staffCount: orgStaffCount,
            geoStaffCount: orgGeoCount,
            isParent: org.id === parentOrg.id
          });
        }

        totalStaffCount += orgStaffCount;
        totalGeoStaffCount += orgGeoCount;
      }

      // Update Parent Org status based on sub
      const shouldBeActive = !!(effectiveSub && new Date(effectiveSub.endAt) >= now);
      const targetStatus = shouldBeActive ? 'ACTIVE' : 'DISABLED';
      if (parentOrg.status !== targetStatus && parentOrg.status !== 'SUSPENDED') {
        await parentOrg.update({ status: targetStatus });
      }

      parentOrg.dataValues.currentSubscription = effectiveSub;
      parentOrg.dataValues.plan = effectiveSub?.plan || null;
      parentOrg.dataValues.staffCount = totalStaffCount;
      parentOrg.dataValues.geoStaffCount = totalGeoStaffCount;
      parentOrg.dataValues.staffLimit = effectiveSub?.staffLimit || effectiveSub?.plan?.staffLimit || 0;
      parentOrg.dataValues.maxGeolocationStaff = effectiveSub?.maxGeolocationStaff !== null ? effectiveSub?.maxGeolocationStaff : (effectiveSub?.plan?.maxGeolocationStaff || 0);
      parentOrg.dataValues.staffBreakdown = staffBreakdown;
      parentOrg.dataValues.isParentAccount = true;
      parentOrg.dataValues.childCount = childrenOrgs.length;

      finalClients.push(parentOrg);
    }

    // Sort by createdAt DESC for the final list
    finalClients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, clients: finalClients });
  } catch (e) {
    console.error('Load clients error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load clients' });
  }
});

// Get staff of a specific client
router.get('/clients/:id/staff', async (req, res) => {
  try {
    const staff = await User.findAll({
      where: {
        orgAccountId: req.params.id,
        role: 'staff' // We only want to promote staff/admin maybe?
      },
      attributes: ['id', 'phone', 'role'],
      include: [{
        model: StaffProfile,
        as: 'profile',
        attributes: ['name']
      }]
    });
    return res.json({ success: true, staff });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load client staff' });
  }
});

// Get client plan details
router.get('/clients/:id/plan-details', async (req, res) => {
  try {
    const clientId = req.params.id;

    // Permission check
    if (req.user.role !== 'superadmin') {
      const perms = req.user.permissions || {};
      if (perms.clients === 'manage_own') {
        const org = await OrgAccount.findByPk(clientId);
        if (!org || org.createdBy !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      } else if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients.map(id => Number(id)) : [];
        if (!selectedIds.includes(Number(clientId))) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      }
    }

    // Get all active/future subscriptions
    const subscriptions = await Subscription.findAll({
      where: { orgAccountId: clientId, status: 'ACTIVE' },
      include: [{
        model: Plan,
        as: 'plan'
      }],
      order: [['startAt', 'ASC']]
    });

    const now = new Date();

    const formattedPlans = subscriptions.map(sub => {
      const start = new Date(sub.startAt);
      const end = new Date(sub.endAt);

      let status = 'active';
      if (end < now) {
        status = 'expired';
      } else if (start > now) {
        // If it starts in more than 24 hours, it's truly future
        const diff = start.getTime() - now.getTime();
        if (diff > 24 * 60 * 60 * 1000) {
          status = 'future';
        } else {
          status = 'active'; // Bridge/Grace period
        }
      }

      return {
        id: sub.id,
        planName: sub.plan?.name || 'Unknown Plan',
        startDate: sub.startAt,
        endDate: sub.endAt,
        status,
        staffLimit: sub.staffLimit || sub.plan?.staffLimit || 0,
        features: (() => {
          const features = sub.plan?.features || [];
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
      };
    });

    return res.json({
      success: true,
      plans: formattedPlans
    });
  } catch (e) {
    console.error('Plan details error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load plan details' });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
    const {
      name, phone, status = 'ACTIVE', clientType, location, extra, businessEmail, state, city,
      channelPartnerId, roleDescription, employeeCount,
      contactPersonName, address, birthDate, anniversaryDate, gstNumber, createdBy
    } = data;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });

    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone) {
      // Note: We allow the same phone number to be an Admin here even if it exists as Staff elsewhere.
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
      createdBy: createdBy || null,
    });

    // Auto-save business info and brand on creation
    try {
      await sequelize.models.OrgBrand.create({ displayName: name, active: true, orgAccountId: row.id });
      await sequelize.models.OrgBusinessInfo.create({
        state: state || null,
        city: city || null,
        addressLine1: address || null,
        active: true,
        orgAccountId: row.id
      });
    } catch (e) {
      console.error('Failed to sync business info on client creation:', e);
    }

    try {
      if (normalizedPhone) {
        let admin = await User.findOne({ where: { phone: String(normalizedPhone), orgAccountId: row.id } });
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
    console.error('Error creating client:', e);
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ success: false, message: e.message || 'Validation failed' });
    }
    return res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

router.put('/clients/:id', async (req, res) => {
  try {
    const user = req.user;
    const row = await OrgAccount.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    // Permission check
    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.clients === 'manage_own' && row.createdBy !== user.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
      if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients.map(id => Number(id)) : [];
        if (!selectedIds.includes(Number(row.id))) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      }
    }
    const {
      name, phone, status, clientType, location, extra, businessEmail, state, city,
      channelPartnerId, roleDescription, employeeCount,
      contactPersonName, address, birthDate, anniversaryDate, gstNumber
    } = req.body || {};

    // Check if phone number already exists in either OrgAccount or User table (excluding current client)
    const normalizedPhone = normalizePhone(phone);

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

    // Sync business info and brand on update
    try {
      const currentName = row.name;
      const currentState = row.state;
      const currentCity = row.city;
      const currentAddress = row.address;
      
      console.log(`[SYNC CLIENT] Syncing client ${row.id} - ${currentName}`);

      if (currentName) {
        const brand = await sequelize.models.OrgBrand.findOne({ where: { active: true, orgAccountId: row.id } });
        if (brand) {
          console.log(`[SYNC CLIENT] Updating existing OrgBrand for ${row.id}`);
          await brand.update({ displayName: currentName });
        } else {
          console.log(`[SYNC CLIENT] Creating new OrgBrand for ${row.id}`);
          await sequelize.models.OrgBrand.create({ displayName: currentName, active: true, orgAccountId: row.id });
        }
      }
      
      const info = await sequelize.models.OrgBusinessInfo.findOne({ where: { active: true, orgAccountId: row.id } });
      const infoUpdates = {
        state: currentState || null,
        city: currentCity || null,
        addressLine1: currentAddress || null
      };
      
      if (info) {
        console.log(`[SYNC CLIENT] Updating existing OrgBusinessInfo for ${row.id}`);
        await info.update(infoUpdates);
      } else {
        console.log(`[SYNC CLIENT] Creating new OrgBusinessInfo for ${row.id}`);
        await sequelize.models.OrgBusinessInfo.create({ ...infoUpdates, active: true, orgAccountId: row.id });
      }
      console.log(`[SYNC CLIENT] Sync completed successfully for ${row.id}`);

      // Sync admin user email in StaffProfile
      if (row.businessEmail) {
        try {
          const admins = await User.findAll({ where: { orgAccountId: row.id, role: 'admin' } });
          for (const admin of admins) {
            const profile = await StaffProfile.findOne({ where: { userId: admin.id } });
            if (profile) {
              if (!profile.email) {
                await profile.update({ email: row.businessEmail });
              }
            } else {
              await StaffProfile.create({
                userId: admin.id,
                orgAccountId: row.id,
                name: admin.name || 'Admin',
                email: row.businessEmail
              });
            }
          }
        } catch (adminSyncError) {
          console.error('[SYNC CLIENT] Failed to sync admin email:', adminSyncError);
        }
      }
    } catch (e) {
      console.error('[SYNC CLIENT] Failed to sync business info on client update:', e);
    }

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

    // Permission check
    if (req.user.role !== 'superadmin') {
      const perms = req.user.permissions || {};
      if (perms.clients === 'manage_own' && org.createdBy !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
      if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients.map(id => Number(id)) : [];
        if (!selectedIds.includes(Number(org.id))) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      }
    }

    const {
      planId, planCode, startAt, staffLimit, maxGeolocationStaff,
      salesEnabled, geolocationEnabled, expenseEnabled,
      payrollEnabled, performanceEnabled, aiReportsEnabled, aiAssistantEnabled, taskManagementEnabled,
      rosterEnabled, recruitmentEnabled, communityEnabled
    } = req.body || {};

    // Handle subscription queuing or updates
    const existingSubscription = await Subscription.findOne({
      where: { orgAccountId: org.id, status: 'ACTIVE' },
      order: [['endAt', 'DESC']]
    });

    const isUpdatingCurrentPlan = existingSubscription && (!planId || planId == existingSubscription.planId) && (new Date(existingSubscription.endAt) > new Date());

    if (isUpdatingCurrentPlan) {
      // If updating limits or feature toggles on the SAME plan that hasn't expired
      const updateData = {};
      let messageArr = [];

      // Check if Start Date is being updated
      if (startAt) {
        const newStart = new Date(startAt);
        const oldStart = new Date(existingSubscription.startAt);

        // Check if difference is significant (> 12 hours)
        const diff = Math.abs(newStart.getTime() - oldStart.getTime());
        if (diff > 1000 * 60 * 60 * 12) {
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
        return res.json({ success: true, message: 'Current subscription remains unchanged', subscription: existingSubscription });
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
        let admin = await User.findOne({ where: { phone: String(normalizedPhone), orgAccountId: org.id } });
        if (!admin) {
          const hash = await bcrypt.hash('123456', 10);
          admin = await User.create({ role: 'admin', orgAccountId: org.id, phone: String(normalizedPhone), passwordHash: hash, active: true });
          
          try {
            await StaffProfile.create({
              userId: admin.id,
              orgAccountId: org.id,
              name: org.name || 'Admin',
              email: org.businessEmail || null
            });
          } catch (profileError) {
            console.error('Failed to create profile in superadmin subscription assignment:', profileError);
          }

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
          
          try {
            const profile = await StaffProfile.findOne({ where: { userId: admin.id } });
            if (profile) {
              if (!profile.email && org.businessEmail) {
                await profile.update({ email: org.businessEmail });
              }
            } else {
              await StaffProfile.create({
                userId: admin.id,
                orgAccountId: org.id,
                name: org.name || 'Admin',
                email: org.businessEmail || null
              });
            }
          } catch (profileError) {
            console.error('Failed to update profile in superadmin subscription assignment:', profileError);
          }

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

    // Permission check
    if (req.user.role !== 'superadmin') {
      const perms = req.user.permissions || {};
      if (perms.clients === 'manage_own') {
        const org = await OrgAccount.findByPk(clientId);
        if (!org || org.createdBy !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      } else if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients.map(id => Number(id)) : [];
        if (!selectedIds.includes(Number(clientId))) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      }
    }

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

    // Permission check
    if (req.user.role !== 'superadmin') {
      const perms = req.user.permissions || {};
      if (perms.clients === 'manage_own') {
        const org = await OrgAccount.findByPk(clientId);
        if (!org || org.createdBy !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      } else if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients.map(id => Number(id)) : [];
        if (!selectedIds.includes(Number(clientId))) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      }
    }

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

    // Permission check
    if (req.user.role !== 'superadmin') {
      const perms = req.user.permissions || {};
      if (perms.clients === 'manage_own' && org.createdBy !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
      if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients.map(id => Number(id)) : [];
        if (!selectedIds.includes(Number(org.id))) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      }
    }

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

    // Fetch all organizations for this phone number
    const allUsers = await User.findAll({
      where: { phone: admin.phone },
      include: [{ model: OrgAccount, as: 'orgAccount' }]
    });

    const orgMap = new Map();
    allUsers.forEach(u => {
      if (!u.orgAccountId) return;
      const key = `${u.orgAccountId}-${u.role}`;
      if (!orgMap.has(key)) {
        orgMap.set(key, {
          id: u.orgAccountId,
          name: u.orgAccount?.name || `Organization ${u.orgAccountId}`,
          role: u.role
        });
      }
    });

    const selectableOrgs = Array.from(orgMap.values());
    const others = allUsers.filter(u => !u.orgAccountId).map(u => ({
      id: null,
      name: u.role === 'superadmin' ? 'Super Admin Panel' : 'Channel Partner Panel',
      role: u.role,
      isSuperadminPanel: u.role === 'superadmin'
    }));

    // Calculate canCreateOrg
    const { StaffBadge, Badge } = require('../models');
    let hasCreateOrgAccess = false;
    const badge = await Badge.findOne({ where: { name: 'create_org_tab' } });
    if (badge) {
      const assignment = await StaffBadge.findOne({
        where: {
          phone: String(admin.phone),
          badgeId: badge.id
        }
      });
      if (assignment) hasCreateOrgAccess = true;
    }

    return res.json({
      success: true,
      token,
      user: { id: admin.id, role: admin.role, phone: admin.phone, name },
      organizations: [...selectableOrgs, ...others],
      canCreateOrg: hasCreateOrgAccess || selectableOrgs.some(o => o.role === 'admin')
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

    // Permission check
    if (req.user.role !== 'superadmin') {
      const perms = req.user.permissions || {};
      if (perms.clients === 'manage_own' && org.createdBy !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
      if (perms.clients === 'manage_selected') {
        const selectedIds = Array.isArray(perms.selectedClients) ? perms.selectedClients.map(id => Number(id)) : [];
        if (!selectedIds.includes(Number(org.id))) {
          return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      }
    }

    let newStatus;
    if (org.status === 'SUSPENDED') {
      const sub = await Subscription.findOne({
        where: { orgAccountId: org.id, status: 'ACTIVE' },
        order: [['endAt', 'DESC']]
      });
      const now = new Date();
      newStatus = (sub && new Date(sub.endAt) >= now) ? 'ACTIVE' : 'DISABLED';
    } else {
      newStatus = 'SUSPENDED';
    }

    await org.update({ status: newStatus });

    // Sync business info and brand on status toggle
    try {
      const currentName = org.name;
      const currentState = org.state;
      const currentCity = org.city;
      const currentAddress = org.address;
      
      console.log(`[SYNC CLIENT] Syncing client ${org.id} - ${currentName} from toggle-status`);

      if (currentName) {
        const brand = await sequelize.models.OrgBrand.findOne({ where: { active: true, orgAccountId: org.id } });
        if (brand) {
          console.log(`[SYNC CLIENT] Updating existing OrgBrand for ${org.id}`);
          await brand.update({ displayName: currentName });
        } else {
          console.log(`[SYNC CLIENT] Creating new OrgBrand for ${org.id}`);
          await sequelize.models.OrgBrand.create({ displayName: currentName, active: true, orgAccountId: org.id });
        }
      }
      
      const info = await sequelize.models.OrgBusinessInfo.findOne({ where: { active: true, orgAccountId: org.id } });
      const infoUpdates = {
        state: currentState || null,
        city: currentCity || null,
        addressLine1: currentAddress || null
      };
      
      if (info) {
        console.log(`[SYNC CLIENT] Updating existing OrgBusinessInfo for ${org.id}`);
        await info.update(infoUpdates);
      } else {
        console.log(`[SYNC CLIENT] Creating new OrgBusinessInfo for ${org.id}`);
        await sequelize.models.OrgBusinessInfo.create({ ...infoUpdates, active: true, orgAccountId: org.id });
      }
      console.log(`[SYNC CLIENT] Sync completed successfully for ${org.id}`);
    } catch (e) {
      console.error('[SYNC CLIENT] Failed to sync business info on client status toggle:', e);
    }

    return res.json({ success: true, status: newStatus });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to toggle status' });
  }
});

// ── STAFF MANAGEMENT (Superadmin Staff) ──────────────────────────────────────


router.post('/staff', async (req, res) => {
  try {
    const { phone, permissions, password, userId } = req.body;
    let normalized = normalizePhone(phone);

    // We will store the superadmin lead permissions in the user's permissions field
    let basePermissions = permissions;
    if (typeof basePermissions === 'string') {
      try { basePermissions = JSON.parse(basePermissions); } catch (e) { basePermissions = {}; }
    }

    const superPermissions = {
      ...(basePermissions || {}),
      superadmin_access: true
    };

    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      let currentPerms = user.permissions;
      while (typeof currentPerms === 'string' && currentPerms.startsWith('{')) {
        try { currentPerms = JSON.parse(currentPerms); } catch (e) { break; }
      }
      if (typeof currentPerms !== 'object' || currentPerms === null) currentPerms = {};

      const mergedPerms = {
        ...currentPerms,
        ...(basePermissions || {}),
        superadmin_access: true
      };

      await user.update({
        permissions: mergedPerms
      });
      return res.json({ success: true, user });
    }

    if (!normalized) return res.status(400).json({ success: false, message: 'Phone required' });

    const existing = await User.findOne({ where: { phone: normalized } });
    if (existing) {
      let currentPerms = existing.permissions;
      while (typeof currentPerms === 'string' && currentPerms.startsWith('{')) {
        try { currentPerms = JSON.parse(currentPerms); } catch (e) { break; }
      }
      if (typeof currentPerms !== 'object' || currentPerms === null) currentPerms = {};

      const mergedPerms = {
        ...currentPerms,
        ...(basePermissions || {}),
        superadmin_access: true
      };

      await existing.update({ permissions: mergedPerms });
      return res.json({ success: true, user: existing });
    }

    const passwordHash = await bcrypt.hash(password || 'staff123', 10);
    const user = await User.create({
      phone: normalized,
      role: 'staff', // Default to staff so they can use APK
      permissions: superPermissions,
      passwordHash,
      active: true
    });

    return res.json({ success: true, user });
  } catch (e) {
    console.error('Create staff error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create staff' });
  }
});

// Helper to list all users who have superadmin_access: true
router.get('/staff', async (req, res) => {
  console.log('[Superadmin] GET /staff hit!');
  try {
    const allUsers = await User.findAll({
      attributes: ['id', 'phone', 'role', 'permissions', 'createdAt'],
      include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
    });

    const staff = allUsers.filter(u => {
      let perms = u.permissions;
      let safety = 0;
      while (typeof perms === 'string' && safety < 5) {
        try {
          const parsed = JSON.parse(perms);
          if (parsed === perms) break;
          perms = parsed;
        } catch (e) { break; }
        safety++;
      }
      return perms && typeof perms === 'object' && perms.superadmin_access === true;
    }).map(u => {
      let perms = u.permissions;
      let safety = 0;
      while (typeof perms === 'string' && safety < 5) {
        try {
          const parsed = JSON.parse(perms);
          if (parsed === perms) break;
          perms = parsed;
        } catch (e) { break; }
        safety++;
      }
      const data = u.toJSON();
      return {
        ...data,
        name: data.profile?.name || null,
        permissions: perms
      };
    });

    console.log(`[Superadmin] Found ${staff.length} staff members with superadmin_access`);
    return res.json({ success: true, staff });
  } catch (e) {
    console.error('Fetch staff error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const { phone, permissions, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    let perms = permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch (e) { }
    }

    // Ensure we don't lose superadmin_access on update
    let currentPerms = user.permissions;
    while (typeof currentPerms === 'string' && currentPerms.startsWith('{')) {
      try { currentPerms = JSON.parse(currentPerms); } catch (e) { break; }
    }
    if (typeof currentPerms !== 'object' || currentPerms === null) currentPerms = {};

    const finalPerms = {
      ...currentPerms,
      ...(perms || {}),
      superadmin_access: true
    };

    const updateData = { permissions: finalPerms };
    if (phone) updateData.phone = normalizePhone(phone);
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    await user.update(updateData);
    return res.json({ success: true, user });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update staff' });
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    // Revoke superadmin_access
    let perms = user.permissions;
    while (typeof perms === 'string' && (perms.startsWith('{') || perms.startsWith('['))) {
      try {
        const parsed = JSON.parse(perms);
        if (parsed === perms) break;
        perms = parsed;
      } catch (e) { break; }
    }
    if (typeof perms !== 'object' || perms === null) perms = {};

    delete perms.superadmin_access;

    // Use a fresh object to ensure Sequelize detects the change
    await user.update({ permissions: { ...perms } });
    return res.json({ success: true, message: 'Staff access revoked' });
  } catch (e) {
    console.error('Revoke error:', e);
    return res.status(500).json({ success: false, message: 'Failed to revoke access' });
  }
});


// ── LEADS MANAGEMENT ─────────────────────────────────────────────────────────

router.get('/leads/config', async (req, res) => {
  try {
    const configs = await LeadConfig.findAll();
    const result = {};
    configs.forEach(c => {
      try {
        result[c.key] = JSON.parse(c.options || '[]');
      } catch (_) {
        result[c.key] = [];
      }
    });
    return res.json({ success: true, config: result });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load lead config' });
  }
});

router.put('/leads/config', async (req, res) => {
  try {
    const { key, options } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'key required' });

    const [config, created] = await LeadConfig.findOrCreate({
      where: { key },
      defaults: { options: JSON.stringify(options || []) }
    });

    if (!created) {
      await config.update({ options: JSON.stringify(options || []) });
    }

    return res.json({ success: true, config });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update lead config' });
  }
});

router.get('/leads/export-template', async (_req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads Template');

    worksheet.columns = [
      { header: 'Company Name*', key: 'companyName', width: 25 },
      { header: 'Person Name', key: 'personName', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 20 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Customer Type', key: 'customerType', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Next Follow Up (YYYY-MM-DD)', key: 'nextFollowUpDate', width: 25 },
      { header: 'Last Follow Up (YYYY-MM-DD)', key: 'lastFollowUpDate', width: 25 },
      { header: 'Handled By', key: 'handledBy', width: 15 },
      { header: 'Service Required', key: 'serviceRequired', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];

    // Add a demo row
    worksheet.addRow({
      companyName: 'ThinkTech Software',
      personName: 'John Doe',
      phone: '9876543210',
      email: 'john@example.com',
      address: 'Kolkata, West Bengal',
      customerType: 'Direct',
      category: 'IT Services',
      status: 'Demo',
      nextFollowUpDate: '2026-05-10',
      lastFollowUpDate: '2026-04-20',
      handledBy: 'Admin',
      serviceRequired: 'Payroll, Sales',
      remarks: 'Interested in core HR features'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ success: false, message: 'Template generation failed' });
  }
});

router.post('/leads/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    const leadsToImport = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const companyName = row.getCell(1).value;
      if (!companyName) return;

      leadsToImport.push({
        companyName: String(companyName).trim(),
        personName: row.getCell(2).value ? String(row.getCell(2).value).trim() : null,
        phone: row.getCell(3).value ? String(row.getCell(3).value).trim() : null,
        email: row.getCell(4).value ? String(row.getCell(4).value).trim() : null,
        address: row.getCell(5).value ? String(row.getCell(5).value).trim() : null,
        customerType: row.getCell(6).value ? String(row.getCell(6).value).trim() : null,
        category: row.getCell(7).value ? String(row.getCell(7).value).trim() : null,
        status: row.getCell(8).value ? String(row.getCell(8).value).trim() : null,
        nextFollowUpDate: row.getCell(9).value ? String(row.getCell(9).value).trim() : null,
        lastFollowUpDate: row.getCell(10).value ? String(row.getCell(10).value).trim() : null,
        handledBy: row.getCell(11).value ? String(row.getCell(11).value).trim() : null,
        serviceRequired: row.getCell(12).value ? String(row.getCell(12).value).trim() : null,
        remarks: row.getCell(13).value ? String(row.getCell(13).value).trim() : null,
        createdBy: req.user.id
      });
    });

    if (leadsToImport.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid leads found in excel' });
    }

    await Lead.bulkCreate(leadsToImport);
    return res.json({ success: true, message: `Successfully imported ${leadsToImport.length} leads` });
  } catch (e) {
    console.error('Lead import error:', e);
    return res.status(500).json({ success: false, message: 'Lead import failed' });
  }
});

router.get('/leads/export', async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.leads === 'manage_own') {
        where = { createdBy: user.id };
      }
    }

    const { company, phone, customerType, category, status, handledBy, serviceRequired } = req.query || {};

    if (company) where.companyName = { [Op.like]: `%${company}%` };
    if (phone) where.phone = { [Op.like]: `%${phone}%` };
    if (customerType) where.customerType = customerType;
    if (category) where.category = category;
    if (status) where.status = status;
    if (handledBy) where.handledBy = handledBy;
    if (serviceRequired) where.serviceRequired = { [Op.like]: `%${serviceRequired}%` };

    const leads = await Lead.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['phone'] }],
      order: [['createdAt', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Leads');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Company Name', key: 'companyName', width: 25 },
      { header: 'Person Name', key: 'personName', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 20 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Customer Type', key: 'customerType', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Next Follow Up', key: 'nextFollowUpDate', width: 15 },
      { header: 'Last Follow Up', key: 'lastFollowUpDate', width: 15 },
      { header: 'Handled By', key: 'handledBy', width: 15 },
      { header: 'Service Required', key: 'serviceRequired', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    leads.forEach(l => {
      worksheet.addRow({
        ...l.toJSON(),
        createdAt: l.createdAt ? new Date(l.createdAt).toLocaleString() : ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=all_leads.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('Lead export error:', e);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

router.get('/leads', async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.leads === 'manage_own') {
        where = { createdBy: user.id };
      }
    }

    const leads = await Lead.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, leads });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load leads' });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
    const lead = await Lead.create(data);
    return res.json({ success: true, lead });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create lead' });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Permission check
    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.leads === 'manage_own' && lead.createdBy !== user.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
    }

    await lead.update(req.body);
    return res.json({ success: true, lead });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update lead' });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Permission check
    if (user.role !== 'superadmin') {
      const perms = user.permissions || {};
      if (perms.leads === 'manage_own' && lead.createdBy !== user.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
    }

    await lead.destroy();
    return res.json({ success: true, message: 'Lead deleted' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete lead' });
  }
});

module.exports = router;

