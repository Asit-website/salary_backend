const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { User, StaffProfile, OtpVerify, OrgAccount, ChannelPartner } = require('../models');
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

    let user;
    if (allUsers.length === 1) {
      user = allUsers[0];
    } else {
      // Multiple users found
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
        
        // If there's a superadmin/partner without orgId, they should also be selectable
        const others = allUsers.filter(u => !u.orgAccountId).map(u => ({
          id: null,
          name: u.role === 'superadmin' ? 'Super Admin Panel' : 'Channel Partner Panel',
          role: u.role
        }));

        return res.json({ 
          success: true, 
          requireSelection: true, 
          organizations: [...selectableOrgs, ...others] 
        });
      } else {
        // Find the specific user for this org
        user = allUsers.find(u => String(u.orgAccountId) === String(orgId) || (orgId === 'null' && !u.orgAccountId));
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
    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, name, staffId, orgAccountId: user.orgAccountId, channelPartnerId: user.channelPartnerId },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, role: user.role, phone: user.phone, name, staffId, orgAccountId: user.orgAccountId, channelPartnerId: user.channelPartnerId },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to verify OTP' });
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
    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, name, staffId, orgAccountId: user.orgAccountId, channelPartnerId: user.channelPartnerId },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, role: user.role, phone: user.phone, name, staffId, orgAccountId: user.orgAccountId, channelPartnerId: user.channelPartnerId },
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
