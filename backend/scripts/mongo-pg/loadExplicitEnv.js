"use strict";

const fs = require("fs");
const path = require("path");

const FORBIDDEN_REF = /iydzhtyrxesvnbbnkldh|att_|gnfnjajyvnydmnpekxta/i;
const MANHUA_REF = "qkxftogqjjdigocfdqmn";

function isPlaceholderEnvValue(value) {
  if (value == null) return true;
  const s = String(value).trim();
  if (!s) return true;
  if (/<[^>]+>/.test(s)) return true;
  if (/YOUR_|PASTE_|REPLACE_|changeme|DB_PASSWORD/i.test(s)) return true;
  return false;
}

function isUsablePostgresUrl(value) {
  if (isPlaceholderEnvValue(value)) return false;
  return /^postgres(ql)?:\/\//i.test(String(value).trim());
}

function describePgTarget(pgUri) {
  if (!isUsablePostgresUrl(pgUri)) {
    return { usable: false, kind: "missing-or-placeholder" };
  }
  try {
    const u = new URL(pgUri);
    return {
      usable: true,
      kind: /127\.0\.0\.1|localhost/.test(u.hostname) ? "isolated-local" : "hosted",
      host: u.hostname,
      port: u.port || null,
      hasManhuaRef: String(pgUri).includes(MANHUA_REF),
      isUndrah: FORBIDDEN_REF.test(pgUri),
    };
  } catch {
    return { usable: false, kind: "unparseable" };
  }
}

function parseEnvFile(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`env file missing: ${abs}`);
  }
  const out = {};
  for (const raw of fs.readFileSync(abs, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { abs, values: out };
}

function hostOf(value) {
  if (!value) return "";
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname || "";
  } catch {
    return "";
  }
}

function assertManhuaSupabaseEnv(values) {
  const url = values.SUPABASE_URL || "";
  const host = hostOf(url);
  if (!host) throw new Error("SUPABASE_URL missing in explicit env file");
  if (FORBIDDEN_REF.test(host) || FORBIDDEN_REF.test(url)) {
    throw new Error("refusing Undrah/attendance/unrelated Supabase project");
  }
  if (!host.includes(MANHUA_REF)) {
    throw new Error(`SUPABASE_URL is not the Manhua-site project (${MANHUA_REF})`);
  }
  return { host, ref: MANHUA_REF };
}

/**
 * Load one gitignored file into process.env.
 * Does not read backend/.env unless that path is passed explicitly.
 * Never copies MONGO_URI from a Supabase env file.
 */
function loadExplicitEnv(filePath, opts = {}) {
  const { abs, values } = parseEnvFile(filePath);
  const deny = new Set(opts.denyKeys || []);
  if (/supabase/i.test(path.basename(abs))) {
    deny.add("MONGO_URI");
    deny.add("MONGODB_URI");
    deny.add("DB_DRIVER");
    assertManhuaSupabaseEnv(values);
  }
  const applied = [];
  for (const [key, value] of Object.entries(values)) {
    if (deny.has(key)) continue;
    if (opts.allowKeys && !opts.allowKeys.has(key)) continue;
    if (isPlaceholderEnvValue(value)) continue;
    if (!opts.override && process.env[key]) continue;
    process.env[key] = value;
    applied.push(key);
  }
  return { file: abs, appliedKeys: applied.sort() };
}

function resolvePostgresUrlFromValues(values = {}) {
  return [values.DATABASE_URL_DIRECT, values.DATABASE_URL].find(isUsablePostgresUrl) || "";
}

function pgClientConfig(pgUri) {
  const hosted = /supabase/i.test(pgUri || "") || String(pgUri || "").includes(MANHUA_REF);
  let connectionString = pgUri || "";
  if (hosted && connectionString) {
    try {
      const u = new URL(connectionString);
      u.searchParams.delete("sslmode");
      connectionString = u.toString();
    } catch {
      connectionString = pgUri;
    }
  }
  return {
    connectionString,
    ssl: hosted ? { rejectUnauthorized: false } : false,
  };
}

function envFileFromArgv(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith("--env-file="));
  if (flag) return flag.slice("--env-file=".length);
  return process.env.MIGRATE_ENV_FILE || "";
}

function assertPostgresTarget(pgUri) {
  if (!isUsablePostgresUrl(pgUri)) throw new Error("DATABASE_URL missing");
  if (FORBIDDEN_REF.test(pgUri)) {
    throw new Error("refusing Undrah/attendance/unrelated Postgres URL");
  }
  const local = /127\.0\.0\.1|localhost/;
  if (local.test(pgUri)) {
    if (/:55432\b/.test(pgUri)) {
      throw new Error("refusing Undrah local Postgres :55432");
    }
    if (/:5432\b/.test(pgUri) && !/:55433\b/.test(pgUri)) {
      throw new Error("refusing default local Postgres :5432");
    }
    return { kind: "isolated-local" };
  }
  if (!pgUri.includes(MANHUA_REF)) {
    throw new Error("hosted DATABASE_URL is not the Manhua-site project");
  }
  if (process.env.ALLOW_SUPABASE_MIGRATE !== "staging") {
    throw new Error("hosted Postgres requires ALLOW_SUPABASE_MIGRATE=staging");
  }
  return { kind: "hosted-manhua", ref: MANHUA_REF };
}

function assertIsolatedMongo(mongoUri) {
  if (!mongoUri) throw new Error("MIGRATE_MONGO_URI missing");
  if (!/127\.0\.0\.1|localhost/.test(mongoUri)) {
    throw new Error("MIGRATE_MONGO_URI must be isolated local Mongo, not production");
  }
  if (/27017\b/.test(mongoUri) && !/27018\b/.test(mongoUri)) {
    throw new Error("refusing default Mongo 27017; isolated restore is :27018");
  }
}

module.exports = {
  MANHUA_REF,
  FORBIDDEN_REF,
  parseEnvFile,
  loadExplicitEnv,
  envFileFromArgv,
  resolvePostgresUrlFromValues,
  assertManhuaSupabaseEnv,
  assertPostgresTarget,
  assertIsolatedMongo,
  hostOf,
  isPlaceholderEnvValue,
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
};
