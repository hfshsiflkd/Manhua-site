// src/middleware/accessCheck.js
// Middleware to check if user has active access (isVIP true OR accessExpiresAt > now)
const User = require("../models/User");
const { computeIsVIP } = require("../utils/vip");

exports.requireActiveAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Login required"
    });
  }

  // Fetch fresh user data to ensure isVIP is up to date
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // Recompute isVIP status
  const isVIP = computeIsVIP(user);
  if (user.isVIP !== isVIP) {
    user.isVIP = isVIP;
    await user.save();
  }

  // Check if user has active access: isVIP true OR accessExpiresAt > now
  const now = Date.now();
  const hasAccess = 
    user.isVIP || 
    (user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > now);
  
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: "Access expired. Please renew your subscription.",
      code: "ACCESS_EXPIRED"
    });
  }

  next();
};

