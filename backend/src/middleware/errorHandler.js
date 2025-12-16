// 404 handler
exports.notFound = (req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
};

// global error handler
exports.errorHandler = (err, req, res, next) => {
  console.error("💥 Error:", err);

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || "Server error",
  };
  
  // Add error code if available
  if (err.code) {
    response.code = err.code;
  }
  
  // Add stack trace in development only
  if (process.env.NODE_ENV === "development" && err.stack) {
    response.stack = err.stack;
  }

  // Log error to audit log
  if (req.audit) {
    const { logAudit } = require("../utils/auditLogger");
    // Trim stack to avoid logging secrets
    const stack = err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : null;
    logAudit(req, {
      level: "ERROR",
      category: "system",
      action: "error",
      message: `${err.message || "Server error"} - ${req.method} ${req.path}`,
      meta: {
        statusCode,
        errorCode: err.code,
        stack: stack,
        name: err.name,
      },
    }).catch((logErr) => {
      console.error("Failed to log error to audit:", logErr);
    });
  }
  
  res.status(statusCode).json(response);
};
