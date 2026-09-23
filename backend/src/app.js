// src/app.js
require("dotenv").config();
const { isPostgres, installPostgresGuards } = require("./store/driver");
const { installMongooseWriteGate } = require("./config/writeGate");
installMongooseWriteGate();
if (isPostgres()) installPostgresGuards();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const { registerCrashHandlers } = require("./middleware/crash");
const connectDB = require("./config/db");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const {
  auditContext,
  auditRequestEnd,
} = require("./middleware/auditMiddleware");
const { writeGateMiddleware } = require("./config/writeGate");

const app = express();

// Ensure DB connection is initialized (serverless-safe)
connectDB().catch((err) => {
  console.error("❌ DB connect init failed:", err);
});

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
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// CORS (public API: allow known origins, no credentials)
const defaultCorsOrigins = [
  "https://www.arc-read.com",
  "https://arcread.vercel.app",
  "http://localhost:3000",
];
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : [];
const corsOrigins = Array.from(new Set([...defaultCorsOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser or same-origin
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: false,
  }),
);
app.set("etag", false);

/* Freeze mutating HTTP before body parsing so PUT/PATCH/DELETE cannot
   reach JSON parser, view/audit handlers, or routes. */
app.use(writeGateMiddleware);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(auditContext);

/* =======================
   Health check
======================= */
app.get("/", (req, res) => {
  const { writesFrozen, inflightMutationCount, deployCommit } = require("./config/writeGate");
  res.json({
    message: "Manhua API is running",
    readOnly: writesFrozen(),
    commit: deployCommit(),
    inflightMutations: inflightMutationCount(),
  });
});

/* =======================
   Routes
======================= */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});
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
