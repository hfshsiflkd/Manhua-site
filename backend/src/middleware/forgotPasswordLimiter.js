const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;
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

// Login: IP дээр 20 удаа / 15 минут
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...(redisClient
    ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
    : {}),
  keyGenerator: (req) => `login:ip:${ipKeyGenerator(req)}`,
  message: {
    success: false,
    message: "Хэт олон нэвтрэх оролдлого. 15 минутын дараа дахин оролдоно уу.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Register: IP дээр 10 удаа / 1 цаг
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...(redisClient
    ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
    : {}),
  keyGenerator: (req) => `register:ip:${ipKeyGenerator(req)}`,
  message: {
    success: false,
    message: "Хэт олон бүртгэлийн оролдлого. 1 цагийн дараа дахин оролдоно уу.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

module.exports = { forgotPasswordIpLimiter, forgotPasswordEmailLimiter, loginLimiter, registerLimiter };
