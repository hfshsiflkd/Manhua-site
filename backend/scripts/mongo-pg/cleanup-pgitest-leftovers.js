#!/usr/bin/env node
"use strict";

/**
 * Delete leftover @pgitest.local / extra.pgitest rows and their R2 objects
 * from the isolated Postgres used by local E2E. Does not touch production Mongo.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const isolatedCandidates = [
  path.join(os.homedir(), "Library/Application Support/arc-read-db-backups/pg-isolated.env"),
  path.join(__dirname, "../../.env.pg-isolated"),
];
let isolated = {};
for (const file of isolatedCandidates) {
  if (fs.existsSync(file)) {
    isolated = parseEnvFile(file);
    break;
  }
}
const backendEnv = parseEnvFile(path.join(__dirname, "../../.env"));
if (!isolated.DATABASE_URL) {
  console.error("isolated DATABASE_URL missing");
  process.exit(1);
}

process.env.DB_DRIVER = "postgres";
process.env.DATABASE_URL = isolated.DATABASE_URL;
for (const key of [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
  "R2_ENDPOINT",
]) {
  if (backendEnv[key]) process.env[key] = backendEnv[key];
}

async function leftoverCounts(query) {
  const r = await query(`
    SELECT
      (SELECT count(*)::int FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local') AS users,
      (SELECT count(*)::int FROM arc.teams WHERE extra->>'pgitest' = 'true' OR name LIKE 'pgitest-%') AS teams,
      (SELECT count(*)::int FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%') AS manhuas,
      (SELECT count(*)::int FROM arc.chapters
        WHERE extra->>'pgitest' = 'true'
           OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')) AS chapters,
      (SELECT count(*)::int FROM arc.team_recruitment_applications
        WHERE extra->>'pgitest' = 'true'
           OR applicant_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')) AS applications
  `);
  return r.rows[0];
}

(async () => {
  const { query, closePool } = require("../../src/db/postgres");
  const { cleanupPgitest } = require("./pgitestCleanup");
  const { cleanupPgitestR2 } = require("./pgitestR2Cleanup");
  const before = await leftoverCounts(query);
  let r2 = { skipped: true };
  try {
    const { r2Client } = require("../../src/config/r2");
    r2 = await cleanupPgitestR2(query, { r2Client, bucket: process.env.R2_BUCKET_NAME });
    delete r2.keys;
  } catch (err) {
    r2 = { error: String(err.message || err) };
  }
  await cleanupPgitest(query);
  const after = await leftoverCounts(query);
  const remainingR2 =
    after.users === 0
      ? { listed: 0 }
      : await (async () => {
          const { r2Client } = require("../../src/config/r2");
          const again = await cleanupPgitestR2(query, { r2Client, bucket: process.env.R2_BUCKET_NAME });
          return { listed: again.listed };
        })();
  console.log(JSON.stringify({ before, r2: { deleted: r2.deleted, listed: r2.listed, users: r2.users, skipped: r2.skipped, error: r2.error }, after, remainingR2 }));
  await closePool();
  const dirty =
    Number(after.users) ||
    Number(after.teams) ||
    Number(after.manhuas) ||
    Number(after.chapters) ||
    Number(after.applications);
  process.exit(dirty ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
