#!/usr/bin/env node
"use strict";

/**
 * Decrypt (if needed), restore dump into a throwaway local Mongo, compare
 * collection counts and _id checksums against the backup manifest.
 */
const { spawnSync, spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { MongoClient } = require("mongodb");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args[0] || ""} failed: ${(res.stderr || res.stdout || "").slice(0, 800)}`);
  }
  return res;
}

function sha256File(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

const BACKUP_ROOT =
  process.env.BACKUP_ROOT ||
  path.join(os.homedir(), "Library/Application Support/arc-read-db-backups");
const latest = fs.existsSync(path.join(BACKUP_ROOT, "LATEST"))
  ? fs.readFileSync(path.join(BACKUP_ROOT, "LATEST"), "utf8").trim()
  : "";
const dir = process.env.BACKUP_DIR || latest;
if (!dir) die("no backup dir");
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "MANIFEST.json"), "utf8"));
const keyPath = path.join(BACKUP_ROOT, "archive.key");
const archivePath = path.join(dir, "dump.archive.gz");
const encryptedPath = path.join(dir, "dump.archive.gz.enc");
const container = "arc-read-mongo-restore";
const port = process.env.RESTORE_MONGO_PORT || "27018";

async function waitForMongo(uri, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1000 });
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      await client.close();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  die("restored mongo did not become ready");
}

async function inventory(uri) {
  const client = new MongoClient(uri);
  await client.connect();
  const admin = client.db("admin");
  const infos = await admin.admin().listDatabases();
  const skip = new Set(["admin", "local", "config"]);
  const dbs = infos.databases.map((d) => d.name).filter((n) => !skip.has(n));
  const out = [];
  for (const dbName of dbs) {
    const db = client.db(dbName);
    const cols = (await db.listCollections().toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith("system."))
      .sort();
    for (const name of cols) {
      const coll = db.collection(name);
      const count = await coll.countDocuments();
      const ids = await coll.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray();
      const hash = crypto.createHash("sha256");
      for (const doc of ids) hash.update(String(doc._id));
      out.push({ dbName, name, count, idSha256: hash.digest("hex") });
    }
  }
  await client.close();
  return out;
}

async function main() {
  if (fs.existsSync(encryptedPath)) {
    const encSha = sha256File(encryptedPath);
    if (encSha !== manifest.encryptedSha256) die("encrypted archive checksum mismatch");
  }
  if (!fs.existsSync(archivePath)) {
    if (!fs.existsSync(encryptedPath)) die("no dump archive");
    console.log("decrypting archive...");
    run("openssl", [
      "enc",
      "-d",
      "-aes-256-cbc",
      "-pbkdf2",
      "-iter",
      "200000",
      "-in",
      encryptedPath,
      "-out",
      archivePath,
      "-pass",
      `file:${keyPath}`,
    ]);
    fs.chmodSync(archivePath, 0o600);
  }
  const dumpSha = sha256File(archivePath);
  if (dumpSha !== manifest.dumpSha256) die("dump archive checksum mismatch");

  run("docker", ["rm", "-f", container], { stdio: "ignore" });
  run("docker", [
    "run",
    "-d",
    "--name",
    container,
    "-p",
    `${port}:27017`,
    "-v",
    `${dir}:/backup:ro`,
    "mongo:7",
    "--replSet",
    "rs0",
    "--bind_ip_all",
  ]);
  const uri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
  await waitForMongo(uri);
  run("docker", [
    "exec",
    container,
    "mongosh",
    "--quiet",
    "--eval",
    "try { rs.initiate({_id:'rs0', members:[{_id:0, host:'127.0.0.1:27017'}]}) } catch (e) { e.message }",
  ]);
  await new Promise((r) => setTimeout(r, 3000));

  const restoreCmd = manifest.oplog
    ? "mongorestore --gzip --archive=/backup/dump.archive.gz --oplogReplay --drop"
    : "mongorestore --gzip --archive=/backup/dump.archive.gz --drop";
  console.log(`mongorestore oplogReplay=${Boolean(manifest.oplog)}...`);
  run("docker", ["exec", container, "bash", "-lc", restoreCmd]);

  const restored = await inventory(uri);
  const appDb = manifest.source.dbName;
  const appRestored = restored.filter((row) => row.dbName === appDb);
  const otherDbs = [...new Set(restored.filter((row) => row.dbName !== appDb).map((row) => row.dbName))];
  const src = Object.fromEntries(manifest.source.collections.map((c) => [c.name, c]));
  const mismatches = [];
  for (const row of appRestored) {
    const expect = src[row.name];
    if (!expect) {
      mismatches.push({ name: row.name, issue: "unexpected collection in app database" });
      continue;
    }
    if (expect.count !== row.count || expect.idSha256 !== row.idSha256) {
      mismatches.push({
        name: row.name,
        issue: "count_or_checksum",
        sourceCount: expect.count,
        restoreCount: row.count,
        checksumMatch: expect.idSha256 === row.idSha256,
      });
    }
  }
  for (const name of Object.keys(src)) {
    if (!appRestored.some((r) => r.name === name) && src[name].count > 0) {
      mismatches.push({ name, issue: "missing in restore", sourceCount: src[name].count });
    }
  }

  const report = {
    restoredAt: new Date().toISOString(),
    dumpSha256: dumpSha,
    oplogReplay: Boolean(manifest.oplog),
    appDb,
    collectionCount: appRestored.length,
    otherClusterDatabases: otherDbs,
    mismatches,
    ok: mismatches.length === 0,
  };
  fs.writeFileSync(path.join(dir, "RESTORE_REPORT.json"), JSON.stringify(report, null, 2));
  fs.chmodSync(path.join(dir, "RESTORE_REPORT.json"), 0o600);
  if (!report.ok) {
    console.error("restore verification FAILED", mismatches.length, "mismatches");
    process.exit(2);
  }
  console.log(`restore verification PASSED collections=${restored.length} dumpSha=${dumpSha.slice(0, 16)}`);
}

main().catch((err) => {
  console.error("restore-verify failed:", err.message);
  process.exit(1);
});
