"use strict";

const WRITE_FREEZE_REDIS_KEY = "arc:write-freeze";
let redisFlag = false;
let redisProbeAt = 0;
let mongooseGateInstalled = false;
let inflightMutations = 0;

function mutatingHttpMethod(method) {
  const m = String(method || "GET").toUpperCase();
  return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}

function envFrozen() {
  const value = String(process.env.API_READ_ONLY || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function writesFrozen() {
  return envFrozen() || redisFlag;
}

async function refreshRedisFreezeFlag() {
  if (Date.now() - redisProbeAt < 1000) return redisFlag;
  redisProbeAt = Date.now();
  try {
    const { getRedisClient } = require("./redis");
    const client = getRedisClient();
    if (!client) {
      redisFlag = false;
      return false;
    }
    const value = await Promise.race([
      client.get(WRITE_FREEZE_REDIS_KEY),
      new Promise((resolve) => setTimeout(() => resolve(null), 200)),
    ]);
    redisFlag = value === "1" || value === "true";
  } catch {
    /* env flag still applies */
  }
  return redisFlag;
}

function freezeError(jobName = "write") {
  const err = new Error(`${jobName} refused: writes are frozen`);
  err.code = "READ_ONLY";
  err.statusCode = 503;
  return err;
}

function assertWritesAllowed(jobName = "job") {
  if (writesFrozen()) throw freezeError(jobName);
}

function isMutatingSql(text) {
  const s = String(text || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .trim();
  if (!s) return false;
  if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|SET|SHOW|DISCARD|LISTEN|UNLISTEN|NOTIFY)\b/i.test(s)) {
    return false;
  }
  return /^(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|COPY|CALL|DO|LOCK|VACUUM|REINDEX|CLUSTER)\b/i.test(
    s
  );
}

async function writeGateMiddleware(req, res, next) {
  await refreshRedisFreezeFlag().catch(() => {});
  const mutating = mutatingHttpMethod(req.method);
  if (writesFrozen()) {
    if (!mutating) return next();
    return res.status(503).json({
      message: "Maintenance: writes are paused",
      code: "READ_ONLY",
    });
  }
  if (mutating) {
    inflightMutations += 1;
    let ended = false;
    const done = () => {
      if (ended) return;
      ended = true;
      inflightMutations = Math.max(0, inflightMutations - 1);
    };
    res.on("finish", done);
    res.on("close", done);
  }
  return next();
}

function wrapFn(obj, method, label) {
  const orig = obj[method];
  if (typeof orig !== "function" || orig.__arcWriteGated) return;
  function gated(...args) {
    assertWritesAllowed(label || `mongoose.${method}`);
    return orig.apply(this, args);
  }
  gated.__arcWriteGated = true;
  obj[method] = gated;
}

function installMongooseWriteGate() {
  if (mongooseGateInstalled) return;
  mongooseGateInstalled = true;
  const mongoose = require("mongoose");
  const statics = [
    "updateOne",
    "updateMany",
    "deleteOne",
    "deleteMany",
    "insertMany",
    "bulkWrite",
    "replaceOne",
    "findOneAndUpdate",
    "findOneAndDelete",
    "findOneAndReplace",
    "findByIdAndUpdate",
    "findByIdAndDelete",
    "findByIdAndRemove",
    "create",
    "insertOne",
    "bulkSave",
  ];
  for (const method of statics) wrapFn(mongoose.Model, method, `mongoose.${method}`);
  wrapFn(mongoose.Model.prototype, "save", "mongoose.save");
  wrapFn(mongoose.Model.prototype, "deleteOne", "mongoose.document.deleteOne");
  wrapFn(mongoose.Model.prototype, "remove", "mongoose.remove");
  wrapFn(mongoose.Query.prototype, "updateOne", "mongoose.query.updateOne");
  wrapFn(mongoose.Query.prototype, "updateMany", "mongoose.query.updateMany");
  wrapFn(mongoose.Query.prototype, "deleteOne", "mongoose.query.deleteOne");
  wrapFn(mongoose.Query.prototype, "deleteMany", "mongoose.query.deleteMany");
  wrapFn(mongoose.Query.prototype, "findOneAndUpdate", "mongoose.query.findOneAndUpdate");
  wrapFn(mongoose.Query.prototype, "findOneAndDelete", "mongoose.query.findOneAndDelete");
  wrapFn(mongoose.Query.prototype, "findOneAndReplace", "mongoose.query.findOneAndReplace");
  wrapFn(mongoose.Query.prototype, "replaceOne", "mongoose.query.replaceOne");
  const origExec = mongoose.Query.prototype.exec;
  if (!origExec.__arcWriteGated) {
    mongoose.Query.prototype.exec = function gatedExec(...args) {
      const op = this.op;
      if (
        [
          "updateOne",
          "updateMany",
          "deleteOne",
          "deleteMany",
          "findOneAndUpdate",
          "findOneAndDelete",
          "findOneAndReplace",
          "replaceOne",
        ].includes(op)
      ) {
        assertWritesAllowed(`mongoose.query.${op}`);
      }
      return origExec.apply(this, args);
    };
    mongoose.Query.prototype.exec.__arcWriteGated = true;
  }
}

module.exports = {
  WRITE_FREEZE_REDIS_KEY,
  writesFrozen,
  assertWritesAllowed,
  writeGateMiddleware,
  isMutatingSql,
  installMongooseWriteGate,
  refreshRedisFreezeFlag,
  freezeError,
  inflightMutationCount: () => inflightMutations,
  deployCommit: () =>
    process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null,
  deployId: () => process.env.VERCEL_DEPLOYMENT_ID || null,
};
