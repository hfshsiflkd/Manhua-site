#!/usr/bin/env node
"use strict";

/**
 * Encrypted pg_dump of production schema arc. Read-only. Never prints URIs,
 * passwords, or row contents.
 *
 *   ALLOW_PROD_PG_DUMP=1 node backend/scripts/mongo-pg/pg-backup.js
 *
 * Writes under ~/Library/Application Support/arc-read-db-backups/pg-<stamp>/
 * Key is ../pg.archive.key (not stored in the dump folder).
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { Client } = require("pg");
const {
  parseEnvFile,
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
  MANHUA_REF,
} = require("./loadExplicitEnv");
const {
  die,
  sha256File,
  sessionPoolerUrl,
  pgEnvFromUrl,
  run,
  inventory,
} = require("./pg-backup-lib");

if (process.env.ALLOW_PROD_PG_DUMP !== "1") {
  die("refusing: set ALLOW_PROD_PG_DUMP=1 to dump production Postgres (read-only)");
}

const BACKUP_ROOT =
  process.env.BACKUP_ROOT ||
  path.join(os.homedir(), "Library/Application Support/arc-read-db-backups");
const stamp = `pg-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const dir = path.join(BACKUP_ROOT, stamp);
const keyPath = path.join(BACKUP_ROOT, "pg.archive.key");
const dumpPath = path.join(dir, "arc.dump");
const encryptedPath = path.join(dir, "arc.dump.enc");
const manifestPath = path.join(dir, "MANIFEST.json");
const envFile = path.join(__dirname, "../../.env.supabase.local");
const PG_IMAGE = process.env.PG_DUMP_IMAGE || "postgres:17-alpine";
const REQUIRED_EXTENSIONS = ["citext", "pg_trgm", "pgcrypto"];

function sourceUrl() {
  const parsed = parseEnvFile(envFile);
  const pooler = parsed.values.DATABASE_URL;
  const direct = parsed.values.DATABASE_URL_DIRECT;
  // This workstation cannot resolve db.<ref>.supabase.co (IPv4). Prefer the
  // session pooler (:5432) for dump + snapshot. Direct is last resort.
  const candidates = [];
  if (isUsablePostgresUrl(pooler)) candidates.push(sessionPoolerUrl(pooler));
  if (isUsablePostgresUrl(direct)) candidates.push(direct);
  if (!candidates.length) die("hosted DATABASE_URL missing");
  let lastMeta = null;
  for (const url of candidates) {
    const meta = describePgTarget(url);
    lastMeta = meta;
    if (meta.isUndrah) die("refusing unrelated Supabase project");
    if (!meta.hasManhuaRef) continue;
    if (meta.kind !== "hosted") continue;
    if (meta.host && meta.host.startsWith("db.") && meta.host.endsWith(".supabase.co")) continue;
    return { url, meta };
  }
  die(`no reachable hosted Manhua-site URL (${MANHUA_REF}) host=${lastMeta && lastMeta.host}`);
}

async function withSnapshotClient(url, fn) {
  const client = new Client({
    ...pgClientConfig(url),
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  try {
    await client.query("SET default_transaction_read_only = on");
    await client.query("SET idle_in_transaction_session_timeout = 0");
    await client.query("SET statement_timeout = 0");
    await client.query("SET lock_timeout = '60s'");
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snap = await client.query("SELECT pg_export_snapshot() AS id");
    const snapshotId = snap.rows[0].id;
    const keepAlive = setInterval(() => {
      client.query("SELECT 1").catch(() => {});
    }, 10000);
    try {
      return await fn(client, snapshotId);
    } finally {
      clearInterval(keepAlive);
      try {
        await client.query("COMMIT");
      } catch {
        /* ignore */
      }
    }
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

function dockerPgDump({ pgEnv, snapshotId, outFile }) {
  const envArgs = [];
  const env = { ...process.env, ...pgEnv };
  for (const key of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE"]) {
    envArgs.push("-e", key);
  }
  const dumpCmd = [
    "pg_dump",
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
    "--schema=arc",
    "--no-sync",
    `--file=${outFile}`,
  ];
  if (snapshotId) dumpCmd.push(`--snapshot=${snapshotId}`);
  else dumpCmd.push("--serializable-deferrable");
  run(
    "docker",
    ["run", "--rm", "--network", "bridge", "-v", `${dir}:/backup`, ...envArgs, PG_IMAGE, ...dumpCmd],
    { env }
  );
}

async function main() {
  fs.mkdirSync(BACKUP_ROOT, { mode: 0o700, recursive: true });
  fs.chmodSync(BACKUP_ROOT, 0o700);
  fs.mkdirSync(dir, { mode: 0o700, recursive: true });
  fs.chmodSync(dir, 0o700);

  if (!fs.existsSync(keyPath)) {
    fs.writeFileSync(keyPath, crypto.randomBytes(32), { mode: 0o600 });
    fs.chmodSync(keyPath, 0o600);
    console.log("created pg archive key (not printed; stored next to dumps, not inside dump folder)");
  }

  const { url, meta } = sourceUrl();
  const pgEnv = pgEnvFromUrl(url, { hosted: true });
  console.log(`dumping arc from hosted pooler session port=${meta.port} image=${PG_IMAGE}`);

  let snapshotId = null;
  let snap = null;
  let dumpMode = "serializable-deferrable";
  try {
    await withSnapshotClient(url, async (client, id) => {
      snapshotId = id;
      const ver = await client.query("SHOW server_version");
      console.log("capturing consistent snapshot inventory...");
      snap = await inventory(client);
      snap.serverVersion = ver.rows[0].server_version;
      console.log(
        `snapshot tables=${snap.tableCount} rows=${snap.rowCount} constraints=${snap.constraintCount} indexes=${snap.indexCount} sequences=${snap.sequences.length}`
      );
      console.log("pg_dump using exported snapshot (read-only)...");
      try {
        dockerPgDump({ pgEnv, snapshotId: id, outFile: "/backup/arc.dump" });
        dumpMode = "repeatable-read-snapshot";
      } catch (err) {
        console.log("snapshot dump failed; retrying serializable-deferrable (still read-only)");
        dockerPgDump({ pgEnv, snapshotId: null, outFile: "/backup/arc.dump" });
        dumpMode = "serializable-deferrable-after-snapshot-fail";
      }
    });
  } catch (err) {
    console.log("could not hold snapshot; using serializable-deferrable dump only");
    const client = new Client({ ...pgClientConfig(url), connectionTimeoutMillis: 15000 });
    await client.connect();
    try {
      await client.query("SET default_transaction_read_only = on");
      await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const ver = await client.query("SHOW server_version");
      snap = await inventory(client);
      snap.serverVersion = ver.rows[0].server_version;
      await client.query("COMMIT");
    } finally {
      await client.end();
    }
    dockerPgDump({ pgEnv, snapshotId: null, outFile: "/backup/arc.dump" });
    dumpMode = "serializable-deferrable";
  }

  if (!fs.existsSync(dumpPath) || fs.statSync(dumpPath).size < 100) {
    die("dump missing or too small");
  }

  const dumpSha = sha256File(dumpPath);
  console.log("encrypting dump...");
  run("openssl", [
    "enc",
    "-aes-256-cbc",
    "-pbkdf2",
    "-iter",
    "200000",
    "-salt",
    "-in",
    dumpPath,
    "-out",
    encryptedPath,
    "-pass",
    `file:${keyPath}`,
  ]);
  const encSha = sha256File(encryptedPath);

  const manifest = {
    kind: "postgres-arc",
    generatedAt: new Date().toISOString(),
    projectRef: MANHUA_REF,
    tool: "pg_dump --format=custom --schema=arc",
    dumpMode,
    snapshotExported: Boolean(snapshotId),
    requiredExtensions: REQUIRED_EXTENSIONS,
    dumpBytes: fs.statSync(dumpPath).size,
    encryptedBytes: fs.statSync(encryptedPath).size,
    dumpSha256: dumpSha,
    encryptedSha256: encSha,
    cipher: "openssl enc -aes-256-cbc -pbkdf2 -iter 200000",
    keyFile: "pg.archive.key (BACKUP_ROOT, not this folder)",
    source: {
      kind: meta.kind,
      hostKind: "supabase-session-pooler",
      port: meta.port,
      schema: "arc",
      inventory: snap,
    },
    restore: {
      decrypt:
        "openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in arc.dump.enc -out arc.dump -pass file:../pg.archive.key",
      isolated:
        "CREATE EXTENSION citext, pg_trgm, pgcrypto; pg_restore --no-owner --no-privileges --exit-on-error --dbname=arc_restore arc.dump",
      verify: "ALLOW_PG_RESTORE_VERIFY=1 node backend/scripts/mongo-pg/pg-restore-verify.js",
    },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.chmodSync(dumpPath, 0o600);
  fs.chmodSync(encryptedPath, 0o600);
  fs.chmodSync(manifestPath, 0o600);
  fs.writeFileSync(path.join(BACKUP_ROOT, "LATEST_PG"), `${dir}\n`, { mode: 0o600 });
  console.log(
    `backup ok stamp=${stamp} tables=${snap.tableCount} rows=${snap.rowCount} dumpSha=${dumpSha.slice(0, 16)} mode=${dumpMode}`
  );
  if (process.env.BACKUP_PRINT_DIR === "1") console.log(dir);
}

main().catch((err) => {
  console.error("pg-backup failed:", err.message);
  process.exit(1);
});
