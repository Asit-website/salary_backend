const crypto = require('crypto');

// Resolve the 32-byte encryption key from the environment variable
const getEncryptionKey = () => {
  const envKey = process.env.DATABASE_ENCRYPTION_KEY;
  if (!envKey) {
    console.warn('[SECURITY WARNING] DATABASE_ENCRYPTION_KEY is not defined. Using fallback hash key.');
    return crypto.createHash('sha256').update('fallback_secret_32_bytes_long_key').digest();
  }

  // If the key is a 64-character hex string, convert it to a 32-byte buffer
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }

  // Otherwise, hash whatever string is provided to guarantee a 32-byte key
  return crypto.createHash('sha256').update(envKey).digest();
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM

/**
 * Encrypts cleartext using AES-256-GCM
 * @param {string|number|object} value - Value to encrypt
 * @returns {string} - Formatted as iv_hex:auth_tag_hex:ciphertext_hex
 */
const encrypt = (value) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  // Convert objects/arrays to string, numbers to string
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts ciphertext using AES-256-GCM
 * @param {string} cipherText - Formatted as iv_hex:auth_tag_hex:ciphertext_hex
 * @param {string} [type='string'] - Target type to cast ('string', 'number', 'json')
 * @returns {string|number|object} - Plain text value cast to target type
 */
const decrypt = (cipherText, type = 'string') => {
  if (!cipherText || typeof cipherText !== 'string') {
    return cipherText;
  }

  const parts = cipherText.split(':');
  // If the format does not match encrypted structure, return as-is (e.g. legacy plain text)
  if (parts.length !== 3) {
    return castValue(cipherText, type);
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return castValue(decrypted, type);
  } catch (err) {
    console.error('[SECURITY ERROR] Decryption failed. Returning raw value.', err.message);
    return castValue(cipherText, type);
  }
};

/**
 * Utility to cast decrypted string to its appropriate application type
 */
const castValue = (val, type) => {
  if (val === null || val === undefined || val === '') return val;
  if (type === 'number') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (type === 'json') {
    try {
      return typeof val === 'string' ? JSON.parse(val) : val;
    } catch (err) {
      console.warn('[SECURITY WARNING] Failed to parse decrypted JSON.', err.message);
      return val;
    }
  }
  return val;
};

module.exports = {
  encrypt,
  decrypt
};
