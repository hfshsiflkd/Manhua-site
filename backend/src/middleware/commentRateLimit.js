// src/middleware/commentRateLimit.js
// Rate limiter: max 1 comment per 10 seconds per user
const rateLimit = require("express-rate-limit");

const commentRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 1, // 1 comment per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Rate limit per user (req.user should always exist since route is protected)
    if (req.user && req.user._id) {
      return `comment:${req.user._id}`;
    }
    // Fallback: use ipKeyGenerator helper for IPv6 safety
    return `comment:${rateLimit.ipKeyGenerator(req, res)}`;
  },
  message: {
    success: false,
    message:
      "Хэт олон сэтгэгдэл илгээх оролдлого. 10 секунд хүлээгээд дахин оролдоно уу.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  skip: (req) => {
    // Skip rate limiting for admins
    return req.user && req.user.role === "admin";
  },
});

module.exports = { commentRateLimiter };
