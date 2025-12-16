// src/app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const { registerCrashHandlers } = require("./middleware/crash");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { auditContext, auditRequestEnd } = require("./middleware/auditMiddleware");


const app = express();

/* =======================
   Crash log
======================= */
registerCrashHandlers();

/* =======================
   Middlewares
======================= */
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

// CORS
const origins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["*"];

app.use(
  cors({
    origin: origins[0] === "*" ? "*" : origins,
    credentials: true,
  })
);
app.set("etag", false);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* =======================
   Audit logging middleware
======================= */
app.use(auditContext);

/* =======================
   Health check
======================= */
app.get("/", (req, res) => {
  res.json({ message: "Manhua API is running" });
});

/* =======================
   Routes
======================= */
app.use("/api", routes);

/* =======================
   Audit request end (before error handler)
======================= */
app.use(auditRequestEnd);

/* =======================
   Error handling
======================= */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
