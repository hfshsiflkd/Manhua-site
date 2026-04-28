// src/middleware/accessCheck.js
// Middleware to check if user has active access (isVIP true OR freeReadMode enabled)
const User = require("../models/User");
const AppSetting = require("../models/AppSetting");
const { computeIsVIP } = require("../utils/vip");
const redisCache = require("../cache/redisCache");

const FREE_READ_CACHE_KEY = "setting:freeReadMode";

async function isFreeReadActive() {
  const cached = await redisCache.get(FREE_READ_CACHE_KEY);
  if (cached !== null) return cached;

  const doc = await AppSetting.findOne({ key: "freeReadMode" });
  const setting = doc?.value || { enabled: false, expiresAt: null };
  const active =
    setting.enabled &&
    (!setting.expiresAt || new Date(setting.expiresAt).getTime() > Date.now());

  await redisCache.set(FREE_READ_CACHE_KEY, active, 30);
  return active;
}

exports.requireActiveAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Login required"
    });
  }

  // If free read mode is globally active, allow everyone
  const freeRead = await isFreeReadActive();
  if (freeRead) return next();

  // Use req.user already loaded by protect middleware — no extra DB query needed
  const isVIP = computeIsVIP(req.user);

  // Sync stale isVIP flag asynchronously (best-effort, doesn't block the request)
  if (req.user.isVIP !== isVIP) {
    User.updateOne({ _id: req.user._id }, { $set: { isVIP } }).catch(() => {});
  }

  if (!isVIP) {
    return res.status(403).json({
      success: false,
      message: "Access expired. Please renew your subscription.",
      code: "ACCESS_EXPIRED"
    });
  }

  next();
};

