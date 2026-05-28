const rateLimit = require('express-rate-limit');

// Strict rate limiter for authentication routes (5 requests per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per auth route
  message: {
    success: false,
    message: 'Too many login or OTP attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter
};
