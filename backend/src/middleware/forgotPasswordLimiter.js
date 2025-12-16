const rateLimit = require("express-rate-limit");

// IP дээр: 5 удаа / 15 минут
const forgotPasswordIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Дахин оролдоно уу. Түр хүлээнэ үү.",
  },
});

// Email дээр: 3 удаа / 1 цаг
const forgotPasswordEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || req.body?.identifier || "")
      .trim()
      .toLowerCase();
    return email ? `fp:email:${email}` : `fp:email:unknown`;
  },
  message: {
    ok: false,
    message: "Дахин оролдоно уу. Түр хүлээнэ үү.",
  },
});

module.exports = { forgotPasswordIpLimiter, forgotPasswordEmailLimiter };
