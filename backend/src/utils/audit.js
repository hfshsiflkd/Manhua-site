const AuditLog = require("../models/AuditLog");

async function writeAudit({ adminId, targetUserId, action, before = {}, after = {}, req }) {
  try {
    await AuditLog.create({
      adminId,
      targetUserId,
      action,
      changes: { before, after },
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || "",
      userAgent: req?.headers?.["user-agent"] || "",
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
}

module.exports = { writeAudit };

