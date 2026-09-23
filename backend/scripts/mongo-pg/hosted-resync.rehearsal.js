#!/usr/bin/env node
"use strict";

/**
 * Truncating remigrate against already-populated hosted Manhua-site Postgres.
 * Proves upsert-only leftovers (source-deleted / stale placeholder rows) are dropped.
 * Source is isolated Mongo :27018. Does not change production Atlas or Vercel.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("pg");
const {
  parseEnvFile,
  loadExplicitEnv,
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
  assertPostgresTarget,
  assertIsolatedMongo,
  resolvePostgresUrlFromValues,
} = require("./loadExplicitEnv");

const STALE_ID = "ffffffffffffffffffffffff";
const SOURCE_MONGO = "mongodb://127.0.0.1:27018/test?directConnection=true";

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function runNode(script, extraEnv, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: path.join(__dirname, "../.."),
    env: extraEnv,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) die(`${script} failed with ${result.status}`);
  return result;
}

async function main() {
  if (process.env.ALLOW_SUPABASE_MIGRATE !== "staging") {
    die("hosted resync requires ALLOW_SUPABASE_MIGRATE=staging");
  }
  assertIsolatedMongo(SOURCE_MONGO);

  const envFile = path.join(__dirname, "../../.env.supabase.local");
  const parsed = parseEnvFile(envFile);
  loadExplicitEnv(envFile, { override: true });
  const pgUri = resolvePostgresUrlFromValues(parsed.values);
  if (!isUsablePostgresUrl(pgUri)) die("hosted DATABASE_URL_DIRECT missing");
  const meta = describePgTarget(pgUri);
  if (meta.kind !== "hosted" || !meta.hasManhuaRef || meta.isUndrah) {
    die("hosted resync target is not Manhua-site Supabase");
  }
  process.env.DATABASE_URL = pgUri;
  assertPostgresTarget(pgUri);

  const env = {
    ...process.env,
    DATABASE_URL: pgUri,
    MIGRATE_TARGET: "hosted-staging",
    MIGRATE_MONGO_URI: SOURCE_MONGO,
    ORPHAN_MODE: "placeholder",
    ALLOW_SUPABASE_MIGRATE: "staging",
  };
  delete env.MONGO_URI;
  delete env.MONGODB_URI;
  delete env.DB_DRIVER;
  delete env.API_READ_ONLY;

  const pg = new Client(pgClientConfig(pgUri));
  await pg.connect();
  await pg.query("SET statement_timeout = 0");
  const before = await pg.query(
    `SELECT
       (SELECT count(*)::int FROM arc.manhuas) AS manhuas,
       (SELECT count(*)::int FROM arc.chapters) AS chapters,
       (SELECT count(*)::int FROM arc.users) AS users`
  );
  console.log(
    JSON.stringify({
      hostedResync: true,
      host: meta.host,
      port: meta.port,
      hasManhuaRef: meta.hasManhuaRef,
      rowsBefore: before.rows[0],
    })
  );

  await pg.query(
    `INSERT INTO arc.manhuas (
      id, title, slug, rating, status, created_by, views, weekly_views, extra, created_at, updated_at
    )
    SELECT $1, 'stale-hosted-upsert-row', 'stale-hosted-upsert-row', 0, 'ongoing', id, 0, 0,
           '{"staleSync":true}'::jsonb, now(), now()
    FROM arc.users ORDER BY created_at ASC LIMIT 1
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, extra = EXCLUDED.extra`,
    [STALE_ID]
  );
  const staleBefore = await pg.query(`SELECT 1 FROM arc.manhuas WHERE id=$1`, [STALE_ID]);
  if (!staleBefore.rowCount) die("failed to insert hosted stale row");

  console.log("=== truncating hosted remigrate ===");
  runNode(path.join(__dirname, "migrate.js"), env, [`--env-file=${envFile}`]);

  const staleAfter = await pg.query(`SELECT 1 FROM arc.manhuas WHERE id=$1`, [STALE_ID]);
  if (staleAfter.rowCount) die("stale hosted row survived truncating resync");

  const leftoverPgitest = await pg.query(
    `SELECT count(*)::int AS n FROM arc.users WHERE email LIKE '%@pgitest.local' OR extra->>'pgitest' = 'true'`
  );
  if (leftoverPgitest.rows[0].n) {
    die(`pgitest users remained after truncating resync: ${leftoverPgitest.rows[0].n}`);
  }

  console.log("=== verify-source-target ===");
  runNode(path.join(__dirname, "verify-source-target.js"), env, [`--env-file=${envFile}`]);
  console.log("=== placeholder-report ===");
  runNode(path.join(__dirname, "placeholder-report.js"), env, [`--env-file=${envFile}`]);

  const after = await pg.query(
    `SELECT
       (SELECT count(*)::int FROM arc.manhuas) AS manhuas,
       (SELECT count(*)::int FROM arc.chapters) AS chapters,
       (SELECT count(*)::int FROM arc.users) AS users`
  );
  await pg.end();

  console.log(
    JSON.stringify({
      ok: true,
      truncatedResyncRemovedStaleRow: true,
      pgitestUsersRemoved: true,
      rowsAfter: after.rows[0],
    })
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
