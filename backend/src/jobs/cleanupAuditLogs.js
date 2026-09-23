// backend/src/jobs/cleanupAuditLogs.js
const AuditLog = require("../models/AuditLog");
const { connectAppDb, disconnectAppDb } = require("../scripts/connectAppDb");
const { assertWritesAllowed } = require("../config/writeGate");

/**
 * Cleanup old audit logs based on retention period
 * Should be run as a cron job (e.g., daily at 2 AM)
 */
async function cleanupAuditLogs() {
  assertWritesAllowed("cleanupAuditLogs");
  try {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || "60");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await AuditLog.deleteMany({
      ts: { $lt: cutoffDate },
    });

    console.log(
      `[CleanupAuditLogs] Deleted ${result.deletedCount} logs older than ${retentionDays} days`
    );

    return result.deletedCount;
  } catch (err) {
    console.error("[CleanupAuditLogs] Error:", err);
    throw err;
  }
}

if (require.main === module) {
  (async () => {
    assertWritesAllowed("cleanupAuditLogs");
    await connectAppDb();
    const count = await cleanupAuditLogs();
    console.log(`Cleanup completed. Deleted ${count} logs.`);
    await disconnectAppDb();
    process.exit(0);
  })().catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  });
}

module.exports = cleanupAuditLogs;
