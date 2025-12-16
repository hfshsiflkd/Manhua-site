// backend/src/middleware/auditMiddleware.js
const crypto = require("crypto");

/**
 * Middleware to attach audit context to request
 * Generates requestId and captures start time
 */
exports.auditContext = (req, res, next) => {
  // Generate unique request ID using crypto.randomUUID (Node 14.17+)
  // Fallback to randomBytes if not available
  let requestId;
  try {
    requestId = crypto.randomUUID();
  } catch {
    requestId = crypto.randomBytes(16).toString("hex");
  }

  req.audit = {
    requestId,
    startTime: Date.now(),
    ip: req.ip || req.connection.remoteAddress || "unknown",
  };

  // Try to get deviceId from header
  const deviceId = req.headers["x-device-id"];
  if (deviceId) {
    req.audit.deviceId = deviceId;
  }

  // User info will be added by protect middleware if available
  if (req.user) {
    req.audit.user = {
      id: req.user._id || req.user.id,
      username: req.user.username,
      role: req.user.role,
    };
  }

  // Capture method and path
  req.audit.method = req.method;
  req.audit.path = req.originalUrl || req.path;

  next();
};

/**
 * Middleware to log request completion
 * Should be placed after routes but before error handler
 */
exports.auditRequestEnd = (req, res, next) => {
  const originalSend = res.send;
  const durationMs = Date.now() - (req.audit?.startTime || Date.now());

  res.send = function (data) {
    // Only log admin and auth routes
    const shouldLog = req.path.startsWith("/api/admin") || req.path.startsWith("/api/auth");

    if (shouldLog && req.audit) {
      // Log asynchronously to not block response
      setImmediate(() => {
        const { logAudit } = require("../utils/auditLogger");
        logAudit(req, {
          level: res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO",
          category: req.path.startsWith("/api/admin") ? "admin" : "auth",
          action: "request",
          message: `${req.method} ${req.path} - ${res.statusCode}`,
          meta: {
            statusCode: res.statusCode,
            durationMs,
          },
        }).catch((err) => {
          console.error("Failed to log audit:", err);
        });
      });
    }

    originalSend.call(this, data);
  };

  next();
};

