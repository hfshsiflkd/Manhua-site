#!/usr/bin/env node
"use strict";

/**
 * Decrypt production arc dump, restore into a throwaway local Postgres 17
 * container (127.0.0.1 only), compare schema/rows/constraints/indexes/checksums
 * to the backup snapshot. Does not touch production or the :55433 test DB.
 *
 *   ALLOW_PG_RESTORE_VERIFY=1 node backend/scripts/mongo-pg/pg-restore-verify.js
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { Client } = require("pg");
const { pgClientConfig } = require("./loadExplicitEnv");
const { die, sha256File, run, inventory, compareInventories } = require("./pg-backup-lib");

if (process.env.ALLOW_PG_RESTORE_VERIFY !== "1") {
  die("refusing: set ALLOW_PG_RESTORE_VERIFY=1");
}

const BACKUP_ROOT =
  process.env.BACKUP_ROOT ||
  path.join(os.homedir(), "Library/Application Support/arc-read-db-backups");
const latest = fs.existsSync(path.join(BACKUP_ROOT, "LATEST_PG"))
  ? fs.readFileSync(path.join(BACKUP_ROOT, "LATEST_PG"), "utf8").trim()
  : "";
const dir = process.env.BACKUP_DIR || latest;
if (!dir) die("no postgres backup dir");
if (!dir.startsWith(BACKUP_ROOT)) die("backup dir is outside BACKUP_ROOT");

const manifest = JSON.parse(fs.readFileSync(path.join(dir, "MANIFEST.json"), "utf8"));
if (manifest.kind !== "postgres-arc") die("manifest is not a postgres-arc backup");

const keyPath = path.join(BACKUP_ROOT, "pg.archive.key");
const dumpPath = path.join(dir, "arc.dump");
const encryptedPath = path.join(dir, "arc.dump.enc");
const container = process.env.PG_RESTORE_CONTAINER || "arc-read-pg-restore-verify";
const port = process.env.PG_RESTORE_PORT || "55434";
const image = process.env.PG_RESTORE_IMAGE || "postgres:17-alpine";
const restoreUser = "arc";
const restoreDb = "arc_restore";
const restorePass = crypto.randomBytes(18).toString("base64url");
const deletePlaintext = process.env.KEEP_PLAINTEXT_DUMP === "1" ? false : true;

async function waitForPg(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    const client = new Client({
      ...pgClientConfig(url),
      connectionTimeoutMillis: 1000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  die("restore postgres did not become ready");
}

async function main() {
  if (fs.existsSync(encryptedPath)) {
    const encSha = sha256File(encryptedPath);
    if (encSha !== manifest.encryptedSha256) die("encrypted dump checksum mismatch");
  }
  if (!fs.existsSync(dumpPath)) {
    if (!fs.existsSync(encryptedPath)) die("no dump file");
    if (!fs.existsSync(keyPath)) die("pg.archive.key missing");
    console.log("decrypting dump...");
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
      dumpPath,
      "-pass",
      `file:${keyPath}`,
    ]);
    fs.chmodSync(dumpPath, 0o600);
  }
  const dumpSha = sha256File(dumpPath);
  if (dumpSha !== manifest.dumpSha256) die("dump checksum mismatch");

  try {
    run("docker", ["rm", "-f", container]);
  } catch {
    /* container may not exist yet */
  }
  run(
    "docker",
    [
      "run",
      "-d",
      "--name",
      container,
      "-p",
      `127.0.0.1:${port}:5432`,
      "-e",
      "POSTGRES_USER",
      "-e",
      "POSTGRES_PASSWORD",
      "-e",
      "POSTGRES_DB",
      "-v",
      `${dir}:/backup:ro`,
      image,
    ],
    {
      env: {
        ...process.env,
        POSTGRES_USER: restoreUser,
        POSTGRES_PASSWORD: restorePass,
        POSTGRES_DB: restoreDb,
      },
    }
  );

  const restoreUrl = `postgres://${restoreUser}:${restorePass}@127.0.0.1:${port}/${restoreDb}`;
  await waitForPg(restoreUrl);

  const extSql = (manifest.requiredExtensions || ["citext", "pg_trgm", "pgcrypto"])
    .map((name) => `CREATE EXTENSION IF NOT EXISTS ${name};`)
    .join(" ");
  run("docker", ["exec", container, "psql", "-U", restoreUser, "-d", restoreDb, "-v", "ON_ERROR_STOP=1", "-c", extSql]);
  console.log("pg_restore into isolated postgres 17...");
  run("docker", [
    "exec",
    container,
    "pg_restore",
    "-U",
    restoreUser,
    "-d",
    restoreDb,
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    "/backup/arc.dump",
  ]);

  const client = new Client({ ...pgClientConfig(restoreUrl), connectionTimeoutMillis: 10000 });
  await client.connect();
  let restored;
  try {
    restored = await inventory(client);
    const fkInvalid = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = 'arc' AND c.contype = 'f' AND NOT c.convalidated`
    );
    restored.unvalidatedForeignKeys = fkInvalid.rows[0].n;
  } finally {
    await client.end();
  }

  const source = manifest.source.inventory;
  const mismatches = compareInventories(source, restored);
  if (restored.unvalidatedForeignKeys) {
    mismatches.push({ issue: "unvalidated_foreign_keys", count: restored.unvalidatedForeignKeys });
  }

  const report = {
    restoredAt: new Date().toISOString(),
    dumpSha256: dumpSha,
    encryptedSha256: manifest.encryptedSha256,
    restoreTarget: { host: "127.0.0.1", port, database: restoreDb, container, image },
    source: {
      tableCount: source.tableCount,
      rowCount: source.rowCount,
      constraintCount: source.constraintCount,
      indexCount: source.indexCount,
      dataSha256: source.dataSha256,
    },
    restored: {
      tableCount: restored.tableCount,
      rowCount: restored.rowCount,
      constraintCount: restored.constraintCount,
      foreignKeyCount: restored.foreignKeyCount,
      indexCount: restored.indexCount,
      sequenceCount: restored.sequences.length,
      dataSha256: restored.dataSha256,
      unvalidatedForeignKeys: restored.unvalidatedForeignKeys,
    },
    mismatches,
    ok: mismatches.length === 0,
  };
  const reportPath = path.join(dir, "RESTORE_REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.chmodSync(reportPath, 0o600);

  run("docker", ["rm", "-f", container], { stdio: "ignore" });
  if (deletePlaintext && fs.existsSync(dumpPath)) {
    fs.unlinkSync(dumpPath);
    console.log("plaintext dump deleted; encrypted archive kept");
  }

  if (!report.ok) {
    console.error("restore verification FAILED", mismatches.length, "mismatches");
    process.exit(2);
  }
  console.log(
    `restore verification PASSED tables=${restored.tableCount} rows=${restored.rowCount} constraints=${restored.constraintCount} indexes=${restored.indexCount} dumpSha=${dumpSha.slice(0, 16)}`
  );
}

main().catch((err) => {
  try {
    run("docker", ["rm", "-f", container], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  console.error("pg-restore-verify failed:", err.message);
  process.exit(1);
});
