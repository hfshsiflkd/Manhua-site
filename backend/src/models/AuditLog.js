// backend/src/models/AuditLog.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const auditLogSchema = new mongoose.Schema(
  {
    ts: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ["INFO", "WARN", "ERROR"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["auth", "device", "payment", "content", "reader", "comment", "admin", "system"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    user: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
      username: String,
      role: String,
    },
    ip: {
      type: String,
      index: true,
    },
    deviceIdHash: {
      type: String,
      index: true,
    },
    method: String,
    path: String,
    statusCode: Number,
    durationMs: Number,
    requestId: {
      type: String,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, // We use ts field instead
  }
);

// Compound indexes for common queries
auditLogSchema.index({ category: 1, action: 1, ts: -1 });
auditLogSchema.index({ "user.id": 1, ts: -1 });
auditLogSchema.index({ ip: 1, ts: -1 });
auditLogSchema.index({ ts: -1 }); // Already indexed above, but explicit for clarity

// Helper to hash deviceId
auditLogSchema.statics.hashDeviceId = function (deviceId) {
  if (!deviceId) return null;
  return crypto.createHash("sha256").update(deviceId).digest("hex");
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
