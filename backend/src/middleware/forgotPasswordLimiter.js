const rateLimit = require("express-rate-limit");

// IP дээр: 10 удаа / 15 минут
const forgotPasswordIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу." },
});

// Email/username дээр: 2 удаа / 10 минут
const forgotPasswordIdLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const id = String(req.body?.emailOrUsername || req.body?.email || "")
      .trim()
      .toLowerCase();
    return id ? `fp:${id}` : `fp:unknown`;
  },
  message: { message: "Түр хүлээгээд дахин оролдоно уу." },
});

module.exports = { forgotPasswordIpLimiter, forgotPasswordIdLimiter };
