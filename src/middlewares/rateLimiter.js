const rateLimit = require('express-rate-limit');

// Rate limiter for authentication routes (5 requests per 1 minute per IP)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute
  max: 5, // Limit each IP to 5 requests per auth route
  message: {
    success: false,
    message: 'Too many login or OTP attempts. Please try again after 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter
};
