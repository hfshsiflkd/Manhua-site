// backend/src/controllers/admin/auditLogController.js
const AuditLog = require("../../models/AuditLog");
const { parsePagination } = require("../../utils/pagination");

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

    // Search query
    if (q) {
      query.$or = [
        { message: { $regex: q, $options: "i" } },
        { action: { $regex: q, $options: "i" } },
        { path: { $regex: q, $options: "i" } },
        { ip: { $regex: q, $options: "i" } },
        { "user.username": { $regex: q, $options: "i" } },
      ];
    }

    // Filters
    if (level && level !== "all") query.level = level;
    if (category && category !== "all") query.category = category;
    if (action && action.trim() !== "") {
      query.action = { $regex: action.trim(), $options: "i" };
    }
    if (userId) query["user.id"] = userId;
    if (ip) query.ip = ip;

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

    // Debug: log sample response structure
    if (normalizedLogs.length > 0 && process.env.NODE_ENV === "development") {
      console.log("[AuditLog] Sample response:", {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sampleItem: {
          _id: normalizedLogs[0]._id,
          time: normalizedLogs[0].time,
          level: normalizedLogs[0].level,
          category: normalizedLogs[0].category,
          action: normalizedLogs[0].action,
          message: normalizedLogs[0].message.substring(0, 50) + "...",
        },
      });
    }

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

