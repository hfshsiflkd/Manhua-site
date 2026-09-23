#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const {
  loadExplicitEnv,
  envFileFromArgv,
  parseEnvFile,
  assertPostgresTarget,
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
} = require("./loadExplicitEnv");

const file = envFileFromArgv();
if (!file) {
  console.error("usage: node apply-schema.js --env-file=backend/.env.supabase.local");
  process.exit(1);
}
const parsed = parseEnvFile(file);
loadExplicitEnv(file, { override: true });

const pgUri = [parsed.values.DATABASE_URL_DIRECT, parsed.values.DATABASE_URL].find(isUsablePostgresUrl);
if (!pgUri) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "DATABASE_URL_or_DIRECT_missing",
      envFile: path.resolve(file),
      hint: "API keys are not a Postgres password. Paste DATABASE_URL_DIRECT (:5432) from Dashboard → Connect into the explicit env file.",
    })
  );
  process.exit(2);
}

const target = describePgTarget(pgUri);
console.log(JSON.stringify({ applying: true, ...target }));
assertPostgresTarget(pgUri);

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const client = new Client(pgClientConfig(pgUri));
  await client.connect();
  await client.query(sql);
  const tables = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='arc'`
  );
  console.log(JSON.stringify({ ok: true, arcTables: tables.rows[0].n }));
  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
