#!/usr/bin/env node
"use strict";

/**
 * Isolated-only proof that API_READ_ONLY freezes Mongo + Postgres writes.
 * Uses throwaway Mongo db arc_freeze_rehearsal on :27018 (never test/admin/27017).
 * Does not touch production Atlas, Vercel, or hosted Supabase.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { MongoClient, ObjectId } = require("mongodb");
const { Client } = require("pg");
const {
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
  assertPostgresTarget,
  assertIsolatedMongo,
} = require("./loadExplicitEnv");

function parseDotenv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1);
  }
  return out;
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

async function main() {
  delete process.env.DB_DRIVER;
  delete process.env.MONGO_URI;
  delete process.env.MONGODB_URI;
  process.env.API_READ_ONLY = "1";

  const freezeMongo = "mongodb://127.0.0.1:27018/arc_freeze_rehearsal?directConnection=true";
  assertIsolatedMongo(freezeMongo);

  const isolatedCandidates = [
    path.join(os.homedir(), "Library/Application Support/arc-read-db-backups/pg-isolated.env"),
    path.join(__dirname, "../../.env.pg-isolated"),
  ];
  let isolated = {};
  for (const file of isolatedCandidates) {
    isolated = parseDotenv(file);
    if (isolated.DATABASE_URL) break;
  }
  if (!isUsablePostgresUrl(isolated.DATABASE_URL)) die("isolated DATABASE_URL missing");
  const pgMeta = describePgTarget(isolated.DATABASE_URL);
  if (pgMeta.kind !== "isolated-local") die("freeze rehearsal requires isolated Docker Postgres");
  assertPostgresTarget(isolated.DATABASE_URL);

  const { installMongooseWriteGate, assertWritesAllowed, writesFrozen } = require("../../src/config/writeGate");
  installMongooseWriteGate();
  if (!writesFrozen()) die("writesFrozen() false with API_READ_ONLY=1");
  try {
    assertWritesAllowed("freeze.rehearsal");
    die("assertWritesAllowed did not throw");
  } catch (err) {
    if (err.code !== "READ_ONLY") die(`expected READ_ONLY, got ${err.code || err.message}`);
  }

  const mongo = new MongoClient(freezeMongo);
  await mongo.connect();
  const db = mongo.db();
  await db.dropDatabase();
  await db.collection("users").insertOne({
    _id: new ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"),
    username: "freeze-seed",
    email: "freeze@pgitest.local",
    password: "not-used-hash",
  });
  const before = await db.collection("users").countDocuments();

  const mongoose = require("mongoose");
  await mongoose.connect(freezeMongo);
  const User = require("../../src/models/User");
  const Chapter = require("../../src/models/Chapter");

  let createBlocked = false;
  try {
    await User.create({
      username: "freeze-write",
      email: "freeze.write@pgitest.local",
      password: "Freeze-pass-9x",
    });
  } catch (err) {
    createBlocked = err.code === "READ_ONLY";
    if (!createBlocked) die(`User.create: ${err.code || err.message}`);
  }
  if (!createBlocked) die("User.create wrote during freeze");

  let updateBlocked = false;
  try {
    await User.updateOne({ username: "freeze-seed" }, { $set: { username: "mutated" } });
  } catch (err) {
    updateBlocked = err.code === "READ_ONLY";
    if (!updateBlocked) die(`User.updateOne: ${err.code || err.message}`);
  }
  if (!updateBlocked) die("User.updateOne wrote during freeze");

  let deleteBlocked = false;
  try {
    await User.deleteMany({});
  } catch (err) {
    deleteBlocked = err.code === "READ_ONLY";
    if (!deleteBlocked) die(`User.deleteMany: ${err.code || err.message}`);
  }
  if (!deleteBlocked) die("User.deleteMany wrote during freeze");

  let bulkBlocked = false;
  try {
    await Chapter.bulkWrite(
      [{ updateOne: { filter: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb" }, update: { $inc: { views: 1 } } } }],
      { ordered: false }
    );
  } catch (err) {
    bulkBlocked = err.code === "READ_ONLY";
    if (!bulkBlocked) die(`Chapter.bulkWrite: ${err.code || err.message}`);
  }
  if (!bulkBlocked) die("Chapter.bulkWrite wrote during freeze");

  const after = await db.collection("users").countDocuments();
  if (after !== before) die(`Mongo user count changed during freeze: ${before} -> ${after}`);
  const seed = await db.collection("users").findOne({ username: "freeze-seed" });
  if (!seed) die("seed user mutated or deleted during freeze");

  const ttlId = new ObjectId();
  await db.collection("chapterreadmonths").insertOne({
    _id: ttlId,
    chapterId: new ObjectId("cccccccccccccccccccccccc"),
    viewerKey: "ttl-sim",
    monthKey: "2099-01",
    expireAt: new Date(Date.now() - 60_000),
  });
  let ttlAppBlocked = false;
  try {
    const ChapterReadMonth = require("../../src/models/ChapterReadMonth");
    await ChapterReadMonth.deleteMany({ viewerKey: "ttl-sim" });
  } catch (err) {
    ttlAppBlocked = err.code === "READ_ONLY";
    if (!ttlAppBlocked) die(`ChapterReadMonth.deleteMany: ${err.code || err.message}`);
  }
  if (!ttlAppBlocked) die("app TTL-like delete succeeded during freeze");
  const ttlBeforeNative = await db.collection("chapterreadmonths").countDocuments({ _id: ttlId });
  if (!ttlBeforeNative) die("ttl sim row missing before native delete");
  await db.collection("chapterreadmonths").deleteOne({ _id: ttlId });
  const ttlAfterNative = await db.collection("chapterreadmonths").countDocuments({ _id: ttlId });
  if (ttlAfterNative) die("native TTL-equivalent delete failed during freeze");

  await mongoose.disconnect();
  await db.dropDatabase();
  await mongo.close();

  const pg = new Client(pgClientConfig(isolated.DATABASE_URL));
  await pg.connect();
  const viewsBefore = await pg.query(
    `SELECT coalesce(sum(views),0)::bigint AS n FROM arc.chapters`
  );
  const { query } = require("../../src/db/postgres");
  process.env.DATABASE_URL = isolated.DATABASE_URL;
  let pgUpdateBlocked = false;
  try {
    await query(`UPDATE arc.chapters SET views = views + 1`);
  } catch (err) {
    pgUpdateBlocked = err.code === "READ_ONLY";
    if (!pgUpdateBlocked) die(`postgres UPDATE: ${err.code || err.message}`);
  }
  if (!pgUpdateBlocked) die("postgres UPDATE succeeded during freeze");
  const viewsAfter = await pg.query(
    `SELECT coalesce(sum(views),0)::bigint AS n FROM arc.chapters`
  );
  if (String(viewsAfter.rows[0].n) !== String(viewsBefore.rows[0].n)) {
    die("isolated PG chapter views changed during freeze");
  }
  await pg.end();

  const { enqueueEmail } = require("../../src/queues/emailQueue");
  const mailed = await enqueueEmail({ to: "nobody@pgitest.local", subject: "x", html: "x" });
  if (!mailed || mailed.skipped !== true) die("enqueueEmail sent during freeze");

  const job = spawnSync(process.execPath, ["src/jobs/cleanupAuditLogs.js"], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      API_READ_ONLY: "1",
      MONGO_URI: freezeMongo,
      MONGODB_URI: freezeMongo,
    },
    encoding: "utf8",
  });
  if (job.status === 0) die("cleanupAuditLogs exited 0 during freeze");
  if (!/READ_ONLY|frozen/i.test(`${job.stdout}\n${job.stderr}`)) {
    die(`cleanupAuditLogs freeze signal missing: ${job.stderr || job.stdout}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      mongooseCreateUpdateDeleteBulkBlocked: true,
      mongoCountUnchanged: true,
      postgresUpdateBlocked: true,
      emailSkipped: true,
      cleanupJobRefused: true,
      appCannotDeleteExpiredRows: true,
      mongoServerCanDeleteExpiredRows: true,
      throwawayMongoDb: "arc_freeze_rehearsal",
    })
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
