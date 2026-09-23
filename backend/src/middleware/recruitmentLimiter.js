"use strict";

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;
const { getRedisClient } = require("../config/redis");
const { createRedisRateLimitStore } = require("../utils/rateLimitRedisStore");

const redisClient = getRedisClient();
const redisStore = redisClient
  ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
  : {};

const createListingLimiter = rateLimit({
  windowMs: Number(process.env.TEAM_RECRUITMENT_CREATE_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.TEAM_RECRUITMENT_CREATE_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...redisStore,
  keyGenerator: (req) => {
    const uid = req.user?._id || req.user?.id;
    return uid ? `recruitment-create:${uid}` : `recruitment-create:ip:${ipKeyGenerator(req)}`;
  },
  message: {
    success: false,
    message: "Хэт олон зар үүсгэх оролдлого. Дараа дахин оролдоно уу.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

const applyListingLimiter = rateLimit({
  windowMs: Number(process.env.TEAM_RECRUITMENT_APPLY_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.TEAM_RECRUITMENT_APPLY_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...redisStore,
  keyGenerator: (req) => {
    const uid = req.user?._id || req.user?.id;
    return uid ? `recruitment-apply:${uid}` : `recruitment-apply:ip:${ipKeyGenerator(req)}`;
  },
  message: {
    success: false,
    message: "Хэт олон хүсэлт. Дараа дахин оролдоно уу.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

module.exports = { createListingLimiter, applyListingLimiter };
