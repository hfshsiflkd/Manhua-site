// backend/src/middleware/chapterReadRateLimit.js
const rateLimit = require("express-rate-limit");
const hashToken = require("../utils/hashToken");
const { getRedisClient } = require("../config/redis");
const { createRedisRateLimitStore } = require("../utils/rateLimitRedisStore");

const redisClient = getRedisClient();

function getViewerKeyForRateLimit(req, res) {
  const userId = req.user?._id || req.user?.id;
  if (userId) return `user:${String(userId)}`;

  const deviceId = String(req.headers["x-device-id"] || "").trim();
  if (deviceId) return `device:${hashToken(deviceId)}`;

  // Fallback: IP (IPv6-safe)
  return `ip:${rateLimit.ipKeyGenerator(req, res)}`;
}

// Reading is high-frequency, but we still need abuse protection now that read gating is removed.
// These limits are intentionally generous for normal users but reduce burst attacks.
const chapterReadStartLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 240, // allow many starts (client retries / prefetch etc.)
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...(redisClient
    ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
    : {}),
  keyGenerator: (req, res) => `read:start:${getViewerKeyForRateLimit(req, res)}`,
  message: {
    ok: false,
    message: "Too many read start requests. Please slow down.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

const chapterReadConfirmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // ~2 confirms/sec max per viewer/ip
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...(redisClient
    ? { store: createRedisRateLimitStore({ client: redisClient, prefix: "rl:" }) }
    : {}),
  keyGenerator: (req, res) => `read:confirm:${getViewerKeyForRateLimit(req, res)}`,
  message: {
    ok: false,
    message: "Too many read confirm requests. Please slow down.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

module.exports = { chapterReadStartLimiter, chapterReadConfirmLimiter };

