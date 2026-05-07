// src/utils/token.js
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function genSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function genJwt(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      sessionToken: user.sessionToken || null,
      tokenVersion: user.tokenVersion || 0,
      role: user.role || "user",
      // Profile data — /auth/me DB query-г арилгана
      username: user.username || null,
      email: user.email || null,
      isVIP: user.isVIP || false,
      vipExpiresAt: user.vipExpiresAt ? new Date(user.vipExpiresAt).toISOString() : null,
      avatar: user.avatar || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );
}

module.exports = { genSessionToken, genJwt };
