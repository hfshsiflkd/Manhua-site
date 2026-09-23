"use strict";

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;
const { getRedisClient } = require("../config/redis");
const { createRedisRateLimitStore } = require("../utils/rateLimitRedisStore");
const { CREATE_MAX, CREATE_WINDOW_MS } = require("../config/selfServeTeam");

const redisClient = getRedisClient();
const redisStore = redisClient
  ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
  : {};

const createTeamLimiter = rateLimit({
  windowMs: CREATE_WINDOW_MS,
  max: CREATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...redisStore,
  skip: (req) => String(req.user?.role || "") === "admin",
  keyGenerator: (req) => {
    const uid = req.user?._id || req.user?.id;
    return uid ? `team-create:${uid}` : `team-create:ip:${ipKeyGenerator(req)}`;
  },
  message: {
    success: false,
    message: "Хэт олон баг үүсгэх оролдлого. Дараа дахин оролдоно уу.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

module.exports = { createTeamLimiter };
