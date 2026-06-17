const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

// Tighter limit on trade execution endpoints to throttle accidental/runaway trading
const tradeLimiter = rateLimit({
  windowMs: 60000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trade request limit reached. Wait a moment before placing another trade.' },
});

// Stricter limit on auth endpoints to slow down credential-stuffing/brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

module.exports = { apiLimiter, tradeLimiter, authLimiter };
