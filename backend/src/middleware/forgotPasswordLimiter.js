const rateLimit = require("express-rate-limit");
const { getRedisClient } = require("../config/redis");
const { createRedisRateLimitStore } = require("../utils/rateLimitRedisStore");

const redisClient = getRedisClient();

// IP дээр: 5 удаа / 15 минут
const forgotPasswordIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...(redisClient
    ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
    : {}),
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
  passOnStoreError: true,
  ...(redisClient
    ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
    : {}),
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
