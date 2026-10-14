const isProduction = String(process.env.NODE_ENV || 'development') === 'production';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production');
  }
  console.warn('[SECURITY] JWT_SECRET not set — using dev-only fallback. Set JWT_SECRET before deploying.');
  return 'dev_secret_change_me';
}

module.exports = { getJwtSecret };
