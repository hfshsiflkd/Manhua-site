// 404 handler
exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`,
  });
};

// 🚦 Global error handler — алдааны төрөл бүрд тохирсон status + message буцаана.
exports.errorHandler = (err, req, res, next) => {
  // Аль хэдийн response илгээгдсэн бол үргэлжлүүлнэ (express defaults)
  if (res.headersSent) return next(err);

  // Анхдагч утгууд
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Server error";
  let code = err.code;
  let extra = null;

  /* ─────────────────────────────────────────────
     1) Mongoose ValidationError — field-тэй валидаци
     ───────────────────────────────────────────── */
  if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    const fields = {};
    for (const [key, val] of Object.entries(err.errors)) {
      fields[key] = val.message;
    }
    const firstField = Object.keys(fields)[0];
    message = firstField ? `${firstField}: ${fields[firstField]}` : "Validation алдаа";
    extra = { fields };
  }

  /* ─────────────────────────────────────────────
     2) Mongoose CastError — буруу ObjectId, format
     ───────────────────────────────────────────── */
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path || "value"}: ${err.value}`;
  }

  /* ─────────────────────────────────────────────
     3) MongoDB Duplicate key (E11000)
     ───────────────────────────────────────────── */
  if (err.code === 11000) {
    statusCode = 409;
    const fields = err.keyValue ? Object.keys(err.keyValue) : [];
    if (fields.length) {
      const first = fields[0];
      message = `"${err.keyValue[first]}" утга "${first}" талбарт давхардсан байна.`;
      extra = { duplicateField: first, duplicateValue: err.keyValue[first] };
    } else {
      message = "Давхардсан утга байна.";
    }
    code = "DUPLICATE_KEY";
  }

  /* ─────────────────────────────────────────────
     4) JWT алдаанууд
     ───────────────────────────────────────────── */
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token алдаатай эсвэл хүчингүй";
    code = "INVALID_TOKEN";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token хугацаа дууссан. Дахин нэвтэрнэ үү.";
    code = "TOKEN_EXPIRED";
  }

  /* ─────────────────────────────────────────────
     5) Multer file alarm
     ───────────────────────────────────────────── */
  if (err.name === "MulterError") {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Файл хэт том байна";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Хүлээгдээгүй талбар: ${err.field || "file"}`;
    } else {
      message = `Upload алдаа: ${err.message}`;
    }
    code = err.code;
  }

  /* ─────────────────────────────────────────────
     6) JSON parse алдаа (express.json)
     ───────────────────────────────────────────── */
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "JSON форматын алдаа";
    code = "INVALID_JSON";
  }

  /* ─────────────────────────────────────────────
     7) Mongo connection / network алдаа
     ───────────────────────────────────────────── */
  if (err.name === "MongoNetworkError" || err.name === "MongooseServerSelectionError") {
    statusCode = 503;
    message = "Сервер DB-тай холбогдож чадсангүй. Дахин оролдоно уу.";
    code = "DB_UNAVAILABLE";
  }

  /* ─────────────────────────────────────────────
     Console-д бичих (Vercel logs дээр харагдах)
     ───────────────────────────────────────────── */
  console.error("💥 [errorHandler]", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    name: err.name,
    code,
    message,
    stack: err.stack ? err.stack.split("\n").slice(0, 6).join("\n") : null,
  });

  /* ─────────────────────────────────────────────
     Audit log — request-д хамаатай бол
     ───────────────────────────────────────────── */
  if (req.audit) {
    const { logAudit } = require("../utils/auditLogger");
    const stack = err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : null;
    logAudit(req, {
      level: statusCode >= 500 ? "ERROR" : "WARN",
      category: "system",
      action: "error",
      message: `${message} — ${req.method} ${req.path}`,
      meta: {
        statusCode,
        errorCode: code,
        name: err.name,
        stack,
      },
    }).catch((logErr) => {
      console.error("Failed to log error to audit:", logErr);
    });
  }

  /* ─────────────────────────────────────────────
     Хариу
     ───────────────────────────────────────────── */
  const response = {
    success: false,
    message,
  };
  if (code) response.code = code;
  if (extra) Object.assign(response, extra);

  // Stack-ийг production биш үед л буцаана
  if (process.env.NODE_ENV !== "production" && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
