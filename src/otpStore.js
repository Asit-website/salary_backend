const store = new Map();

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function nowMs() {
  return Date.now();
}

function setOtp(phone, code, ttlMs) {
  const key = normalizePhone(phone);
  store.set(String(key), { code: String(code), expiresAt: nowMs() + ttlMs });
}

function verifyOtp(phone, code) {
  const key = normalizePhone(phone);
  const rec = store.get(String(key));
  if (!rec) return { ok: false, reason: 'missing' };
  if (rec.expiresAt < nowMs()) {
    store.delete(String(key));
    return { ok: false, reason: 'expired' };
  }
  if (String(code) !== rec.code) return { ok: false, reason: 'invalid' };
  store.delete(String(key));
  return { ok: true };
}

module.exports = { setOtp, verifyOtp };
