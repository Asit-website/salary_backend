const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { User, StaffProfile, OtpVerify } = require('../models');
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
    if (!user || user.active === false) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const ttlMs = Number(process.env.OTP_TTL_MS || 5 * 60 * 1000);
    const fixed = process.env.OTP_DEV_CODE || '';
    const useFixed = String(process.env.OTP_USE_FIXED || '').toLowerCase() === 'true';
    const code = String(useFixed && fixed ? fixed : Math.floor(100000 + Math.random() * 900000));
    otpStore.setOtp(String(normalizedPhone), code, ttlMs);
    // Also persist in DB for audit/autofill support (OtpVerify table)
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      const lastSentAt = new Date();
      const existing = await OtpVerify.findOne({ where: { phone: normalizedPhone }, order: [['createdAt','DESC']] });
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



    const includeCode = String(process.env.OTP_INCLUDE_IN_RESPONSE || 'true') === 'true';
    return res.json({ success: true, message: smsResult.ok ? 'OTP sent' : 'OTP generated', ...(includeCode ? { otp: code } : {}) });
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
    if (!row) return res.json({ success: true, otp: null });
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

    const v = otpStore.verifyOtp(String(normalizedPhone), String(code));
    if (!v.ok) {
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }

    // Mark consumed in DB for the latest matching code
    try {
      const row = await OtpVerify.findOne({ where: { phone: normalizedPhone, code: String(code) }, order: [['createdAt','DESC']] });
      if (row) await row.update({ consumedAt: new Date() });
    } catch (e) {
      // ignore
    }

    const user = await User.findOne({ where: { phone: String(normalizedPhone) } });
    if (!user || user.active === false) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profile = await StaffProfile.findOne({ where: { userId: user.id } });
    const name = profile?.name || null;

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, name },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, role: user.role, phone: user.phone, name },
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

    const profile = await StaffProfile.findOne({ where: { userId: user.id } });
    const name = profile?.name || null;

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, name },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, role: user.role, phone: user.phone, name },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

module.exports = router;
