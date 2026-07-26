const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per `window` (here, per 15 minutes)
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many AI analysis requests from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  aiLimiter,
};
