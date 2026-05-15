// backend/src/controllers/admin/auditLogController.js
const AuditLog = require("../../models/AuditLog");
const { parsePagination } = require("../../utils/pagination");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/admin/logs
 * Query params:
 * - q: search in message/action/user/ip/path
 * - level: INFO|WARN|ERROR
 * - category: auth|device|payment|content|reader|comment|admin|system
 * - action: string
 * - userId: ObjectId
 * - ip: string
 * - from: ISO date string
 * - to: ISO date string
 * - page: number
 * - limit: number
 */
exports.listLogs = async (req, res, next) => {
  try {
    const {
      q,
      level,
      category,
      action,
      userId,
      ip,
      from,
      to,
    } = req.query;

    const { page, limit } = parsePagination(req.query);

    // Build query
    const query = {};

    // Search query — escape user input before passing to regex (ReDoS / injection)
    if (q) {
      const safeQ = escapeRegex(String(q).slice(0, 200));
      query.$or = [
        { message: { $regex: safeQ, $options: "i" } },
        { action: { $regex: safeQ, $options: "i" } },
        { path: { $regex: safeQ, $options: "i" } },
        { ip: { $regex: safeQ, $options: "i" } },
        { "user.username": { $regex: safeQ, $options: "i" } },
      ];
    }

    // Filters
    if (level && level !== "all") query.level = level;
    if (category && category !== "all") query.category = category;
    if (action && String(action).trim() !== "") {
      const safeAction = escapeRegex(String(action).trim().slice(0, 200));
      query.action = { $regex: safeAction, $options: "i" };
    }
    if (userId && /^[0-9a-fA-F]{24}$/.test(String(userId))) query["user.id"] = userId;
    if (ip) query.ip = String(ip);

    // Date range
    if (from || to) {
      query.ts = {};
      if (from) query.ts.$gte = new Date(from);
      if (to) query.ts.$lte = new Date(to);
    }

    // Execute query
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .sort({ ts: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Normalize timestamps: ensure every log has a canonical `time` field as ISO string
    const normalizedLogs = logs.map((log) => {
      // Get timestamp from ts, createdAt, or fallback to _id timestamp
      let timeValue = log.ts || log.createdAt || log.timestamp;
      
      // If still no timestamp, extract from ObjectId (first 8 chars = seconds since epoch)
      if (!timeValue && log._id) {
        try {
          const objectIdHex = log._id.toString().substring(0, 8);
          const timestampSeconds = parseInt(objectIdHex, 16);
          timeValue = new Date(timestampSeconds * 1000);
        } catch (e) {
          // Fallback to current time if ObjectId parsing fails
          timeValue = new Date();
        }
      }

      // Ensure it's a Date object
      if (!(timeValue instanceof Date)) {
        timeValue = new Date(timeValue);
      }

      // If still invalid, use current time
      if (isNaN(timeValue.getTime())) {
        timeValue = new Date();
      }

      // Return log with normalized time field
      return {
        ...log,
        time: timeValue.toISOString(), // Canonical ISO string field
        ts: timeValue.toISOString(), // Keep ts for backward compatibility
      };
    });

    res.json({
      items: normalizedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/logs/:id
 */
exports.getLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();

    if (!log) {
      return res.status(404).json({ message: "Log олдсонгүй" });
    }

    res.json(log);
  } catch (err) {
    next(err);
  }
};

