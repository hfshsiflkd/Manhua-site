#!/usr/bin/env node
"use strict";

/**
 * BSON mongodump (gzip archive) + AES-256 encryption.
 * Never prints URI, passwords, or document contents.
 *
 * Usage (from repo root):
 *   node backend/scripts/mongo-pg/backup.js
 *
 * Env:
 *   MONGO_URI (from backend/.env)
 *   BACKUP_ROOT optional, default ~/Library/Application Support/arc-read-db-backups
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (process.env.DB_DRIVER === "postgres") die("refusing Mongo backup while DB_DRIVER=postgres");
if (!process.env.MONGO_URI) die("MONGO_URI missing");

const BACKUP_ROOT =
  process.env.BACKUP_ROOT ||
  path.join(os.homedir(), "Library/Application Support/arc-read-db-backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.join(BACKUP_ROOT, stamp);
const keyPath = path.join(BACKUP_ROOT, "archive.key");
const archivePath = path.join(dir, "dump.archive.gz");
const encryptedPath = path.join(dir, "dump.archive.gz.enc");
const manifestPath = path.join(dir, "MANIFEST.json");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "").trim();
    const safe = err.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, "mongodb://[redacted]");
    const wrapped = new Error(`${cmd} failed: ${safe.slice(0, 800)}`);
    wrapped.status = res.status;
    throw wrapped;
  }
  return res;
}

function sha256File(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

async function countsAndChecksums() {
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
  });
  const db = mongoose.connection.db;
  const hello = await db.admin().command({ hello: 1 });
  const collections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();
  const details = [];
  for (const name of collections) {
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    const ids = await coll.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray();
    const hash = crypto.createHash("sha256");
    for (const doc of ids) hash.update(String(doc._id));
    details.push({ name, count, idSha256: hash.digest("hex") });
  }
  await mongoose.disconnect();
  return {
    replicaSet: Boolean(hello.setName),
    dbName: db.databaseName,
    collections: details,
  };
}

async function main() {
  fs.mkdirSync(BACKUP_ROOT, { mode: 0o700, recursive: true });
  fs.chmodSync(BACKUP_ROOT, 0o700);
  fs.mkdirSync(dir, { mode: 0o700, recursive: true });
  fs.chmodSync(dir, 0o700);

  if (!fs.existsSync(keyPath)) {
    fs.writeFileSync(keyPath, crypto.randomBytes(32), { mode: 0o600 });
    fs.chmodSync(keyPath, 0o600);
    console.log("created archive key (not printed)");
  }

  console.log("snapshotting collection counts and id checksums...");
  const snap = await countsAndChecksums();
  console.log(`source replicaSet=${snap.replicaSet} collections=${snap.collections.length}`);

  const dumpArgs = [
    "run",
    "--rm",
    "-e",
    "MONGO_URI",
    "-v",
    `${dir}:/backup`,
    "mongo:7",
    "mongodump",
    "--uri=${MONGO_URI}",
    "--gzip",
    "--archive=/backup/dump.archive.gz",
  ];
  // docker does not expand ${MONGO_URI} in the mongodump argv.
  // Use bash -lc so the env var is used without putting it on the host command line.
  const dockerArgs = [
    "run",
    "--rm",
    "-e",
    "MONGO_URI",
    "-v",
    `${dir}:/backup`,
    "mongo:7",
    "bash",
    "-lc",
    snap.replicaSet
      ? 'mongodump --uri="$MONGO_URI" --gzip --archive=/backup/dump.archive.gz --oplog'
      : 'mongodump --uri="$MONGO_URI" --gzip --archive=/backup/dump.archive.gz',
  ];

  console.log(`mongodump via docker (oplog=${snap.replicaSet})...`);
  let oplogUsed = snap.replicaSet;
  try {
    run("docker", dockerArgs, { env: { ...process.env } });
  } catch (err) {
    if (snap.replicaSet && /oplog/i.test(err.message)) {
      console.log("oplog dump not permitted; retrying without --oplog");
      oplogUsed = false;
      run(
        "docker",
        [
          "run",
          "--rm",
          "-e",
          "MONGO_URI",
          "-v",
          `${dir}:/backup`,
          "mongo:7",
          "bash",
          "-lc",
          'mongodump --uri="$MONGO_URI" --gzip --archive=/backup/dump.archive.gz',
        ],
        { env: { ...process.env } }
      );
    } else {
      throw err;
    }
  }

  if (!fs.existsSync(archivePath) || fs.statSync(archivePath).size < 100) {
    die("dump archive missing or too small");
  }

  const dumpSha = sha256File(archivePath);
  console.log("encrypting archive...");
  run("openssl", [
    "enc",
    "-aes-256-cbc",
    "-pbkdf2",
    "-iter",
    "200000",
    "-salt",
    "-in",
    archivePath,
    "-out",
    encryptedPath,
    "-pass",
    `file:${keyPath}`,
  ]);
  const encSha = sha256File(encryptedPath);

  const manifest = {
    generatedAt: new Date().toISOString(),
    tool: "mongodump --gzip --archive",
    oplog: oplogUsed,
    consistency: oplogUsed
      ? "replica-set oplog dump; restore with mongorestore --oplogReplay"
      : "point-in-time per collection; live writes during dump can make cross-collection references briefly inconsistent",
    dumpBytes: fs.statSync(archivePath).size,
    encryptedBytes: fs.statSync(encryptedPath).size,
    dumpSha256: dumpSha,
    encryptedSha256: encSha,
    cipher: "openssl enc -aes-256-cbc -pbkdf2 -iter 200000",
    source: snap,
    restore: {
      decrypt: "openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in dump.archive.gz.enc -out dump.archive.gz -pass file:../archive.key",
      docker:
        "docker run --rm -e MONGO_URI=mongodb://host.docker.internal:27018 -v $PWD:/backup mongo:7 bash -lc 'mongorestore --uri=\"$MONGO_URI\" --gzip --archive=/backup/dump.archive.gz --oplogReplay'",
    },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.chmodSync(archivePath, 0o600);
  fs.chmodSync(encryptedPath, 0o600);
  fs.chmodSync(manifestPath, 0o600);
  console.log(`backup dir created (path not printed unless BACKUP_PRINT_DIR=1)`);
  if (process.env.BACKUP_PRINT_DIR === "1") console.log(dir);
  fs.writeFileSync(path.join(BACKUP_ROOT, "LATEST"), dir + "\n", { mode: 0o600 });
  console.log(`collections=${snap.collections.length} dumpSha=${dumpSha.slice(0, 16)} oplog=${oplogUsed}`);
}

main().catch((err) => {
  console.error("backup failed:", err.message);
  process.exit(1);
});
