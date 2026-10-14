const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// Rate limiter for authentication routes (stricter in production)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDev ? 200 : 5,
  message: {
    success: false,
    message: isDev
      ? 'Too many login attempts from this device. Wait a few minutes or restart the backend (local dev).'
      : 'Too many login or OTP attempts. Please try again after 5 minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter
};
