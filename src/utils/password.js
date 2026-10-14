const bcrypt = require('bcryptjs');

const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Thinktech@123';

function validateNewPassword(password) {
  const p = String(password || '');
  if (p.length < 8) return 'Password must be at least 8 characters';
  return null;
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

async function hashDefaultPassword() {
  return hashPassword(DEFAULT_USER_PASSWORD);
}

async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(String(plain), String(hash));
  } catch (_) {
    return false;
  }
}

module.exports = {
  DEFAULT_USER_PASSWORD,
  validateNewPassword,
  hashPassword,
  hashDefaultPassword,
  verifyPassword,
};
