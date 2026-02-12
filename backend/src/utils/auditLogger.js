// backend/src/utils/auditLogger.js
const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const crypto = require("crypto");

// Sensitive keys to mask or remove
const SENSITIVE_KEYS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "resetToken",
  "otp",
  "secret",
  "apiKey",
  "authToken",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "jwt",
  "bearer",
];

/**
 * Sanitize metadata object by masking sensitive fields
 */
function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object") {
    return meta;
  }

  if (Array.isArray(meta)) {
    return meta.map((item) => sanitizeMeta(item));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(meta)) {
    const keyLower = key.toLowerCase();

    // Check if key contains sensitive terms
    const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
      keyLower.includes(sensitive.toLowerCase()),
    );

    if (isSensitive) {
      sanitized[key] = "***MASKED***";
    } else if (value && typeof value === "object") {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMeta(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Hash deviceId before storing
 */
function hashDeviceId(deviceId) {
  if (!deviceId) return null;
  return crypto.createHash("sha256").update(deviceId).digest("hex");
}

/**
 * Main logging function
 * @param {Request} req - Express request object (should have req.audit)
 * @param {Object} logData - Log data
 * @param {string} logData.level - "INFO" | "WARN" | "ERROR"
 * @param {string} logData.category - "auth" | "device" | "payment" | "content" | "reader" | "comment" | "admin" | "system"
 * @param {string} logData.action - Action name
 * @param {string} logData.message - Log message
 * @param {Object} logData.meta - Additional metadata (will be sanitized)
 */
async function logAudit(req, { level, category, action, message, meta = {} }) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return;
    }
    const audit = req.audit || {};
    const durationMs = audit.startTime ? Date.now() - audit.startTime : null;

    const logEntry = {
      ts: new Date(),
      level,
      category,
      action,
      message,
      user: audit.user
        ? {
            id: audit.user.id,
            username: audit.user.username,
            role: audit.user.role,
          }
        : null,
      ip: audit.ip || null,
      deviceIdHash: audit.deviceId ? hashDeviceId(audit.deviceId) : null,
      method: audit.method || null,
      path: audit.path || null,
      statusCode: meta.statusCode || null,
      durationMs: meta.durationMs || durationMs,
      requestId: audit.requestId || null,
      meta: sanitizeMeta(meta),
    };

    // Don't await - log asynchronously
    AuditLog.create(logEntry).catch((err) => {
      console.error("Failed to save audit log:", err);
    });
  } catch (err) {
    console.error("Error in logAudit:", err);
  }
}

module.exports = { logAudit, sanitizeMeta, hashDeviceId };
