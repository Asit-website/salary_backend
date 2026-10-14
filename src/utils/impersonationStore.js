const crypto = require('crypto');

const store = new Map();
const TTL_MS = 60 * 1000;

function createImpersonationCode(payload) {
  const code = crypto.randomBytes(32).toString('hex');
  store.set(code, { payload, expiresAt: Date.now() + TTL_MS });
  return code;
}

function consumeImpersonationCode(code) {
  if (!code || typeof code !== 'string') return null;
  const entry = store.get(code);
  store.delete(code);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.payload;
}

module.exports = { createImpersonationCode, consumeImpersonationCode };
