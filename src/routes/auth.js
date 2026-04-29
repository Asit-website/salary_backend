const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { User, StaffProfile, OtpVerify, OrgAccount, ChannelPartner, Subscription, Plan } = require('../models');
const otpStore = require('../otpStore');

// Minimal SMS sender using the provided HTTP API
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

const router = express.Router();

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

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone required' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'phone required' });
    }

    const user = await User.findOne({ where: { phone: String(normalizedPhone) } });
    if (user && user.active === false) {
      return res.status(403).json({ success: false, message: 'User disabled' });
    }

    const ttlMs = Number(process.env.OTP_TTL_MS || 5 * 60 * 1000);
    const fixed = process.env.OTP_DEV_CODE || '';
    const useFixed = String(process.env.OTP_USE_FIXED || '').toLowerCase() === 'true';
    let code = String(useFixed && fixed ? fixed : Math.floor(100000 + Math.random() * 900000));

    // Special case for test number
    if (normalizedPhone === '1231231232') {
      code = '123456';
    }

    otpStore.setOtp(String(normalizedPhone), code, ttlMs);
    // Also persist in DB for audit/autofill support (OtpVerify table)
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      const lastSentAt = new Date();
      const existing = await OtpVerify.findOne({ where: { phone: normalizedPhone }, order: [['createdAt', 'DESC']] });
      if (!existing) {
        await OtpVerify.create({ phone: normalizedPhone, code, expiresAt, consumedAt: null, lastSentAt });
      } else {
        await existing.update({ code, expiresAt, consumedAt: null, lastSentAt });
      }
    } catch (e) {
      // non-fatal
    }

    // Attempt SMS send if credentials configured; gateway expects the raw local number per user example
    const smsResult = await sendSmsViaGateway({ phoneE164: normalizedPhone, code });



    let includeCode = String(process.env.OTP_INCLUDE_IN_RESPONSE || 'true') === 'true';
    if (normalizedPhone === '1231231232') includeCode = false;

    const exists = !!user;
    return res.json({ success: true, message: smsResult.ok ? 'OTP sent' : 'OTP generated', exists, ...(includeCode ? { otp: code } : {}) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Dev-only helper to fetch the latest OTP for a phone (for web autofill during development)
router.get('/otp/latest', async (req, res) => {
  try {
    const expose = (String(process.env.NODE_ENV || 'development') !== 'production')
      || (String(process.env.OTP_INCLUDE_IN_RESPONSE || 'true') === 'true');
    if (!expose) return res.status(404).json({ success: false, message: 'Not found' });

    const phone = req.query?.phone;
    if (!phone) return res.status(400).json({ success: false, message: 'phone required' });
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return res.status(400).json({ success: false, message: 'phone required' });

    const row = await OtpVerify.findOne({
      where: { phone: normalizedPhone },
      order: [['updatedAt', 'DESC']],
    });
    if (!row || normalizedPhone === '1231231232') return res.json({ success: true, otp: null });
    const notExpired = new Date(row.expiresAt).getTime() > Date.now();
    return res.json({ success: true, otp: notExpired ? row.code : null });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'phone and code required' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'phone and code required' });
    }

    const { orgId } = req.body || {};
    const allUsers = await User.findAll({
      where: { phone: String(normalizedPhone) },
      include: [{ model: OrgAccount, as: 'orgAccount' }]
    });

    // Validate OTP
    let v = otpStore.verifyOtp(String(normalizedPhone), String(code), { keep: (!orgId && allUsers.length > 1) });
    if (!v.ok) {
      const row = await OtpVerify.findOne({ where: { phone: normalizedPhone, code: String(code) }, order: [['createdAt', 'DESC']] });
      if (!row || row.consumedAt || (new Date() - new Date(row.createdAt)) > 10 * 60 * 1000) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      if (!orgId && allUsers.length > 1) {
        // Don't consume yet
      } else {
        await row.update({ consumedAt: new Date() });
      }
    }

    if (allUsers.length === 0) {
      return res.json({ success: true, requireSignup: true, phone: normalizedPhone });
    }

    const isMobileApk = req.headers['x-app-platform'] === 'mobile-apk';

    console.log(`Verify-OTP: Found ${allUsers.length} users for phone ${normalizedPhone}. Platform: ${isMobileApk ? 'Mobile' : 'Web'}`);

    let user;
    const hasSuperAccess = allUsers.some(u => {
      let perms = u.permissions;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (e) { }
      }
      const isSuper = u.role === 'superadmin' || (perms && perms.superadmin_access === true);
      console.log(`Checking user ID ${u.id}: role=${u.role}, superAccess=${isSuper}, permsType=${typeof perms}`);
      return isSuper;
    });

    console.log(`Verify-OTP: hasSuperAccess determined as ${hasSuperAccess}`);
    
    // NEW: Check if any user has 'create_org_tab' permission
    const { Badge, BadgePermission, StaffBadge } = require('../models');
    const createOrgAssignments = await StaffBadge.findAll({
      where: { userId: allUsers.map(u => u.id), isActive: true },
      include: [{
        model: Badge,
        as: 'badge',
        where: { isActive: true },
        include: [{
          model: BadgePermission,
          as: 'permissions',
          where: { permissionKey: 'create_org_tab' }
        }]
      }]
    });
    const hasCreateOrgAccess = createOrgAssignments.length > 0;
    console.log(`Verify-OTP: hasCreateOrgAccess determined as ${hasCreateOrgAccess} (found ${createOrgAssignments.length} assignments)`);

    // If exactly one user and it's NOT an admin (who might want to create new orgs), direct login.
    if (allUsers.length === 1) {
      const singleUser = allUsers[0];
      const isGlobalSuper = singleUser.role === 'superadmin';
      const isPartner = singleUser.role === 'channel_partner';

      // If it's a regular user (not admin, not super, not partner), login directly.
      // If it's a specialized user but we are on MOBILE, also login directly.
      // NEW: If it's a GLOBAL superadmin, also login directly on web if it's their only account.
      if ((!isGlobalSuper && !isPartner && singleUser.role !== 'admin' && !hasSuperAccess && !hasCreateOrgAccess) ||
        (allUsers.length === 1 && (isMobileApk || isGlobalSuper))) {
        console.log('Verify-OTP: Single user found, direct login allowed');
        user = singleUser;
      } else {
        console.log(`Verify-OTP: Single user found but direct login REJECTED. role=${singleUser.role}, hasSuperAccess=${hasSuperAccess}, isMobile=${isMobileApk}`);
      }
    }



    if (!user) {
      // Auto-pick for mobile APK if multiple accounts exist
      if (isMobileApk && allUsers.length > 1) {
        // Try to find a regular staff user first
        user = allUsers.find(u => u.role === 'staff' && u.orgAccountId);
        // Fallback to any staff user
        if (!user) user = allUsers.find(u => u.role === 'staff');
        // Fallback to any superadmin staff
        if (!user) user = allUsers.find(u => {
          let p = u.permissions;
          if (typeof p === 'string') try { p = JSON.parse(p); } catch (_) { }
          return p && p.superadmin_access === true;
        });

        if (user) console.log(`Verify-OTP: Mobile APK auto-selected user ID ${user.id} (${user.role})`);
      }
    }

    if (!user) {
      console.log('Verify-OTP: Multiple accounts or admin access found, forcing selection screen');
      // Multiple users OR single admin (to allow "Add Organization" flow)
      if (!orgId) {
        // Return unique list of organizations
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

        // If there's a superadmin/partner without orgId, OR a user with superadmin_access permission, they should be selectable
        const othersMap = new Map();
        allUsers.forEach(u => {
          let perms = u.permissions;
          if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { }
          }
          const isSuper = u.role === 'superadmin' || (perms && perms.superadmin_access === true);
          const isPartner = u.role === 'channel_partner';

          if (isSuper) {
            if (!othersMap.has('superadmin')) {
              othersMap.set('superadmin', {
                id: `superadmin-${u.id}`, // Unique ID
                name: 'Super Admin Permissions',
                role: u.role,
                isSuperadminPanel: true
              });
            }
          } else if (isPartner || !u.orgAccountId) {
            const key = isPartner ? 'partner' : `no-org-${u.role}`;
            if (!othersMap.has(key)) {
              othersMap.set(key, {
                id: isPartner ? `partner-${u.id}` : `panel-${u.id}`,
                name: isPartner ? 'Channel Partner Panel' : `Panel (${u.role})`,
                role: u.role,
                isSuperadminPanel: false
              });
            }
          }
        });

        const others = Array.from(othersMap.values());

        const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
        const tempToken = jwt.sign(
          { phone: normalizedPhone },
          secret,
          { expiresIn: '1h' }
        );

        return res.json({
          success: true,
          requireSelection: true,
          token: tempToken,
          organizations: [...selectableOrgs, ...others],
          canCreateOrg: hasCreateOrgAccess || allUsers.some(u => u.role === 'admin')
        });
      } else {
        // Find the specific user for this org
        if (req.body.isSuperadminPanel) {
          // If it's a superadmin panel selection, find the user with superadmin_access
          user = allUsers.find(u => {
            let perms = u.permissions;
            if (typeof perms === 'string') {
              try { perms = JSON.parse(perms); } catch (e) { }
            }
            return u.role === 'superadmin' || (perms && perms.superadmin_access === true);
          });
        } else if (String(orgId).startsWith('superadmin-')) {
          const userId = orgId.split('-')[1];
          user = allUsers.find(u => String(u.id) === String(userId));
        } else if (String(orgId).startsWith('partner-')) {
          const userId = orgId.split('-')[1];
          user = allUsers.find(u => String(u.id) === String(userId));
        } else if (String(orgId).startsWith('panel-')) {
          const userId = orgId.split('-')[1];
          user = allUsers.find(u => String(u.id) === String(userId));
        } else {
          user = allUsers.find(u => String(u.orgAccountId) === String(orgId) || (orgId === 'null' && !u.orgAccountId));
        }

        if (!user) {
          return res.status(400).json({ success: false, message: 'Invalid organization selection' });
        }
      }
    }

    if (user.active === false) {
      return res.status(403).json({ success: false, message: 'User disabled' });
    }

    // Subscription/Org enforcement on OTP login for non-superadmin and non-partner
    if (user && user.role !== 'superadmin' && user.role !== 'channel_partner') {
      try {
        const { OrgAccount, Subscription, Plan } = require('../models');
        const org = await OrgAccount.findByPk(user.orgAccountId);
        if (!org || org.status !== 'ACTIVE') {
          return res.status(403).json({ success: false, message: 'Organization disabled' });
        }
        const now = new Date();
        const sub = await Subscription.findOne({
          where: { orgAccountId: org.id, status: 'ACTIVE' },
          order: [['endAt', 'DESC']],
          include: [{ model: Plan, as: 'plan' }],
        });
        if (!sub || new Date(sub.endAt) < now) {
          return res.status(402).json({ success: false, message: 'your Plan Expired pls renew' });
        }
      } catch (_) { }
    }

    const profile = await StaffProfile.findOne({ where: { userId: user.id } });
    const name = profile?.name || null;
    const staffId = profile?.staffId || null;

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const isSuperRole = user.role === 'superadmin';
    const isActuallySuperPanel = !!req.body.isSuperadminPanel || isSuperRole;

    const finalToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name,
        staffId,
        orgAccountId: isActuallySuperPanel ? null : user.orgAccountId,
        channelPartnerId: user.channelPartnerId,
        isSuperadminPanel: isActuallySuperPanel,
        permissions: user.permissions
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token: finalToken,
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name,
        staffId,
        orgAccountId: isActuallySuperPanel ? null : user.orgAccountId,
        channelPartnerId: user.channelPartnerId,
        isSuperadminPanel: isActuallySuperPanel,
        permissions: user.permissions
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

router.post('/switch-account', async (req, res) => {
  try {
    const { orgId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      console.error('Switch account token verify failed:', err);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const phone = decoded.phone;
    if (!phone) return res.status(401).json({ success: false, message: 'Invalid session' });

    // Find all users with this phone number - using already imported models
    const allUsers = await User.findAll({ where: { phone: String(phone) } });

    // Find the specific user for the requested orgId
    let user;
    if (req.body.isSuperadminPanel) {
      user = allUsers.find(u => {
        let perms = u.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) { }
        }
        return u.role === 'superadmin' || (perms && perms.superadmin_access === true);
      });
    } else if (String(orgId).startsWith('superadmin-')) {
      const userId = orgId.split('-')[1];
      user = allUsers.find(u => String(u.id) === String(userId));
    } else if (String(orgId).startsWith('partner-')) {
      const userId = orgId.split('-')[1];
      user = allUsers.find(u => String(u.id) === String(userId));
    } else if (String(orgId).startsWith('panel-')) {
      const userId = orgId.split('-')[1];
      user = allUsers.find(u => String(u.id) === String(userId));
    } else {
      user = allUsers.find(u => String(u.orgAccountId) === String(orgId) || (orgId === 'null' && !u.orgAccountId));
    }

    if (!user) {
      console.error('Account not found for phone:', phone, 'orgId:', orgId, 'isSuperadminPanel:', req.body.isSuperadminPanel);
      return res.status(400).json({ success: false, message: 'Account not found for this organization' });
    }

    if (user.active === false) return res.status(403).json({ success: false, message: 'User disabled' });

    // Issue new token
    const profile = await StaffProfile.findOne({ where: { userId: user.id } });
    const name = profile?.name || null;
    const staffId = profile?.staffId || null;

    const newToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name,
        staffId,
        orgAccountId: req.body.isSuperadminPanel ? null : user.orgAccountId, // Nullify orgId for superadmin panel
        channelPartnerId: user.channelPartnerId,
        isSuperadminPanel: !!req.body.isSuperadminPanel,
        permissions: user.permissions
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token: newToken,
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name,
        staffId,
        orgAccountId: req.body.isSuperadminPanel ? null : user.orgAccountId, // Nullify orgId for superadmin panel
        channelPartnerId: user.channelPartnerId,
        isSuperadminPanel: !!req.body.isSuperadminPanel,
        permissions: user.permissions
      },
    });
  } catch (e) {
    console.error('Switch account failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to switch account' });
  }
});

router.post('/add-organization', async (req, res) => {
  try {
    const { name, address, businessEmail } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const phone = decoded.phone;
    if (!phone) return res.status(401).json({ success: false, message: 'Invalid session' });

    // 1. Normalize phone (last 10 digits to be safe)
    const normalizedPhone = phone.length > 10 ? phone.slice(-10) : phone;

    // Find an existing user to copy password hash and name
    // Search both exact and normalized
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { phone: String(phone) },
          { phone: String(normalizedPhone) }
        ]
      }
    });

    if (!existingUser) {
      console.error('No existing user found for phone:', phone);
      return res.status(400).json({ success: false, message: 'Existing account not found' });
    }

    const profile = await StaffProfile.findOne({ where: { userId: existingUser.id } });

    console.log('Creating organization for phone:', normalizedPhone);

    // Create Org
    const org = await OrgAccount.create({
      name,
      address,
      businessEmail,
      phone: String(normalizedPhone),
      status: 'ACTIVE',
      createdBy: decoded.id
    });

    console.log('New Org created:', org.id);

    // Create User record for this phone + new Org
    const newUser = await User.create({
      role: 'admin',
      orgAccountId: org.id,
      phone: String(normalizedPhone),
      passwordHash: existingUser.passwordHash,
      active: true
    });

    console.log('New User created:', newUser.id);

    // Create StaffProfile for new user
    await StaffProfile.create({
      userId: newUser.id,
      orgAccountId: org.id,
      name: profile?.name || 'Admin'
    });

    // NEW: Link this organization to the parent admin(s)
    try {
      console.log('Linking new org to parent admins. Staff phone:', normalizedPhone);
      // Find organizations where this user is currently a staff member
      const staffMemberships = await User.findAll({
        where: { 
          [require('sequelize').Op.or]: [
            { phone: String(phone) },
            { phone: String(normalizedPhone) }
          ],
          role: 'staff'
        },
        attributes: ['orgAccountId']
      });

      const parentOrgIds = staffMemberships.map(m => m.orgAccountId).filter(id => id !== null);
      console.log('Found staff memberships in orgs:', parentOrgIds);

      if (parentOrgIds.length > 0) {
        // Find the admin phones for these organizations
        const admins = await User.findAll({
          where: { orgAccountId: parentOrgIds, role: 'admin' },
          attributes: ['phone', 'passwordHash']
        });

        console.log('Found parent admins:', admins.map(a => a.phone));

        const uniqueAdminPhones = [];
        const seenPhones = new Set([String(phone), String(normalizedPhone)]); // Don't re-add the staff themselves

        for (const admin of admins) {
          const adminPhone = String(admin.phone);
          if (!seenPhones.has(adminPhone)) {
            uniqueAdminPhones.push(admin);
            seenPhones.add(adminPhone);
          }
        }

        console.log('Unique parent admin phones to link:', uniqueAdminPhones.map(a => a.phone));

        // Create admin user records in the new org for these parent admins
        for (const admin of uniqueAdminPhones) {
          const adminUserRecord = await User.create({
            role: 'admin',
            orgAccountId: org.id,
            phone: admin.phone,
            passwordHash: admin.passwordHash,
            active: true
          });

          // Also create a basic staff profile so their name shows up
          const adminProfile = await StaffProfile.findOne({ where: { phone: admin.phone } });
          await StaffProfile.create({
            userId: adminUserRecord.id,
            orgAccountId: org.id,
            name: adminProfile?.name || 'Parent Admin',
            phone: admin.phone
          });
          
          console.log(`Successfully linked new org ${org.id} to parent admin ${admin.phone}`);
        }
      } else {
        console.log('No parent staff memberships found to link.');
      }
    } catch (err) {
      console.error('Failed to link new org to parent admins:', err);
    }

    // Clone subscription from the VERY FIRST organization (Master/Parent)
    try {
      // Find the oldest admin account for this phone
      const firstAdmin = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { phone: String(phone) },
            { phone: String(normalizedPhone) }
          ],
          role: 'admin'
        },
        order: [['id', 'ASC']]
      });

      let templateSub = null;
      if (firstAdmin) {
        console.log('Found firstAdmin for cloning:', firstAdmin.id, 'Org:', firstAdmin.orgAccountId);
        templateSub = await Subscription.findOne({
          where: { orgAccountId: firstAdmin.orgAccountId },
          order: [['endAt', 'DESC']]
        });
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      if (templateSub) {
        console.log('Cloning from template subscription:', templateSub.id);
        const finalEndAt = templateSub.endAt && new Date(templateSub.endAt) > thirtyDaysLater
          ? templateSub.endAt
          : thirtyDaysLater;

        await Subscription.create({
          orgAccountId: org.id,
          planId: templateSub.planId,
          startAt: yesterday,
          endAt: finalEndAt,
          status: 'ACTIVE',
          staffLimit: templateSub.staffLimit || 10,
          maxGeolocationStaff: templateSub.maxGeolocationStaff,
          salesEnabled: templateSub.salesEnabled,
          geolocationEnabled: templateSub.geolocationEnabled,
          expenseEnabled: templateSub.expenseEnabled,
          payrollEnabled: templateSub.payrollEnabled,
          performanceEnabled: templateSub.performanceEnabled,
          aiReportsEnabled: templateSub.aiReportsEnabled,
          aiAssistantEnabled: templateSub.aiAssistantEnabled,
          taskManagementEnabled: templateSub.taskManagementEnabled,
          rosterEnabled: templateSub.rosterEnabled,
          recruitmentEnabled: templateSub.recruitmentEnabled,
          communityEnabled: templateSub.communityEnabled
        });
      } else {
        console.log('No template sub found, using fallback trial plan');
        const trialPlan = await Plan.findOne({ where: { active: true }, order: [['price', 'ASC']] });
        const end = new Date();
        end.setDate(end.getDate() + 30);

        await Subscription.create({
          orgAccountId: org.id,
          planId: trialPlan ? trialPlan.id : 1,
          startAt: yesterday,
          endAt: end,
          status: 'ACTIVE',
          staffLimit: 10,
          salesEnabled: true,
          payrollEnabled: true,
          expenseEnabled: true
        });
      }
      console.log('Subscription created successfully for Org:', org.id);
    } catch (subErr) {
      console.error('Subscription cloning failed:', subErr);
    }

    // Return updated list of organizations
    const allUsers = await User.findAll({
      where: { phone: String(phone) },
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

    const others = allUsers.filter(u => !u.orgAccountId).map(u => ({
      id: null,
      name: u.role === 'superadmin' ? 'Super Admin Panel' : 'Channel Partner Panel',
      role: u.role
    }));

    return res.json({
      success: true,
      organizations: [...Array.from(orgMap.values()), ...others]
    });

  } catch (e) {
    console.error('Add organization failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to add organization' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'phone and password required' });
    }

    const user = await User.findOne({ where: { phone: String(phone) } });
    if (!user || user.active === false) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Subscription/Org enforcement on password login for non-superadmin/partner
    if (user.role !== 'superadmin' && user.role !== 'channel_partner') {
      try {
        const { OrgAccount, Subscription, Plan } = require('../models');
        const org = await OrgAccount.findByPk(user.orgAccountId);
        if (!org || org.status !== 'ACTIVE') {
          return res.status(403).json({ success: false, message: 'Organization disabled' });
        }
        const now = new Date();
        const sub = await Subscription.findOne({
          where: { orgAccountId: org.id, status: 'ACTIVE' },
          order: [['endAt', 'DESC']],
          include: [{ model: Plan, as: 'plan' }],
        });
        if (!sub || new Date(sub.endAt) < now) {
          return res.status(402).json({ success: false, message: 'your Plan Expired pls renew' });
        }
      } catch (_) { }
    }

    const profile = await StaffProfile.findOne({ where: { userId: user.id } });
    const name = profile?.name || null;
    const staffId = profile?.staffId || null;

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const finalToken = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, name, staffId, orgAccountId: user.orgAccountId, channelPartnerId: user.channelPartnerId, isSuperadminPanel: !!req.body.isSuperadminPanel },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const allUsers = await User.findAll({
      where: { phone: user.phone },
      include: [{ model: OrgAccount, as: 'orgAccount' }]
    });

    if (user.role === 'admin' || allUsers.length > 1) {
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
      const others = allUsers.filter(u => {
        let perms = u.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) { }
        }
        return !u.orgAccountId || (perms && perms.superadmin_access === true);
      }).map(u => {
        let perms = u.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) { }
        }
        const isSuper = u.role === 'superadmin' || (perms && perms.superadmin_access === true);
        return {
          id: u.orgAccountId || null,
          name: isSuper ? 'Super Admin Panel' : 'Channel Partner Panel',
          role: u.role,
          isSuperadminPanel: isSuper
        };
      });

      const tempToken = jwt.sign(
        { phone: user.phone },
        secret,
        { expiresIn: '1h' }
      );

      return res.json({
        success: true,
        requireSelection: true,
        token: tempToken,
        organizations: [...selectableOrgs, ...others]
      });
    }

    return res.json({
      success: true,
      token: finalToken,
      user: { id: user.id, role: user.role, phone: user.phone, name, staffId, orgAccountId: user.orgAccountId, channelPartnerId: user.channelPartnerId, isSuperadminPanel: !!req.body.isSuperadminPanel },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Public: signup a new Admin for a new OrgAccount (pending activation by Super Admin)
router.post('/signup-admin', async (req, res) => {
  try {
    const {
      phone, name, businessName, password, businessEmail, state, city,
      channelPartnerId, roleDescription, employeeCount,
      contactPersonName, address, birthDate, anniversaryDate, gstNumber
    } = req.body || {};
    if (!phone || !name || !businessName) {
      return res.status(400).json({ success: false, message: 'phone, name, businessName required' });
    }

    const normalizedPhone = normalizePhone(phone);

    // Check if phone number already exists as a staff member
    const existingStaff = await User.findOne({ where: { phone: String(normalizedPhone), role: 'staff' } });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered as a staff member.'
      });
    }

    // Note: We allow multiple ADMINS with same phone for DIFFERENT organizations.
    // We will check if an admin already exists for THIS specific signup attempt (though signup creates a new org)
    // Actually, we just need to ensure we don't block the signup if an admin exists for another org.

    await validateChannelPartnerMapping({ phone: normalizedPhone, channelPartnerId });

    const org = await OrgAccount.create({
      name: String(businessName),
      phone: String(normalizedPhone),
      status: 'DISABLED',
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
    });

    const hash = await bcrypt.hash(String(password || '123456'), 10);
    const admin = await User.create({ role: 'admin', orgAccountId: org.id, phone: String(normalizedPhone), passwordHash: hash, active: true });
    try { await StaffProfile.create({ userId: admin.id, orgAccountId: org.id, name: String(name) }); } catch (_) { }

    // Send admin signup review email to business email
    if (businessEmail) {
      try {
        const { sendAdminSignupReviewEmail } = require('../services/emailService');
        await sendAdminSignupReviewEmail(businessEmail, name);
      } catch (emailError) {
        console.error('Failed to send admin signup review email:', emailError);
      }
    }

    return res.json({ success: true, orgAccountId: org.id, userId: admin.id });
  } catch (e) {
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ success: false, message: e.message || 'Validation failed' });
    }
    return res.status(500).json({ success: false, message: 'Signup failed' });
  }
});

module.exports = router;
