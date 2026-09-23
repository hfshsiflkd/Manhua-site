// src/middleware/accessCheck.js
// Middleware to check if user has active access (isVIP true OR freeReadMode enabled)
const User = require("../models/User");
const { computeIsVIP } = require("../utils/vip");
const { isFreeReadActive } = require("../utils/freeRead");

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
    const { writesFrozen } = require("../config/writeGate");
    if (!writesFrozen()) {
      User.updateOne({ _id: req.user._id }, { $set: { isVIP } }).catch(() => {});
    }
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

