const rateLimit = require("express-rate-limit");

// Skip rate limiting in test or development environment (for seeding)
const skipInTest = () => process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || process.env.SKIP_RATE_LIMIT === 'true';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // 100 in prod, 10000 otherwise
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 1000, // 5 in prod, 1000 otherwise
  message: {
    error: "Too many authentication attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: skipInTest,
});

// Moderate rate limiter for creating resources
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 create requests per minute
  message: {
    error: "Too many requests, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

module.exports = {
  apiLimiter,
  authLimiter,
  createLimiter,
};
