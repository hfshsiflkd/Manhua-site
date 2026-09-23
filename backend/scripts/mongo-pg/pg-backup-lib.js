"use strict";

const crypto = require("crypto");
const fs = require("fs");
const { spawnSync } = require("child_process");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function redact(text) {
  return String(text || "")
    .replace(/postgres(ql)?:\/\/[^\s'"]+/gi, "postgresql://[redacted]")
    .replace(/PGPASSWORD=\S+/gi, "PGPASSWORD=[redacted]")
    .replace(/password[=:][^\s'"]+/gi, "password=[redacted]");
}

function sha256File(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sessionPoolerUrl(pgUri) {
  const u = new URL(pgUri);
  if (/pooler\.supabase\.com$/i.test(u.hostname) && (u.port === "6543" || u.port === "6432")) {
    u.port = "5432";
  }
  return u.toString();
}

function pgEnvFromUrl(pgUri, { hosted }) {
  const u = new URL(pgUri);
  const db = decodeURIComponent((u.pathname || "/postgres").replace(/^\//, "") || "postgres");
  const sslMode = u.searchParams.get("sslmode") || (hosted ? "require" : "disable");
  return {
    PGHOST: u.hostname,
    PGPORT: u.port || (hosted ? "5432" : "5432"),
    PGUSER: decodeURIComponent(u.username || ""),
    PGPASSWORD: decodeURIComponent(u.password || ""),
    PGDATABASE: db,
    PGSSLMODE: sslMode,
  };
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (res.status !== 0) {
    const err = redact((res.stderr || res.stdout || "").trim());
    const wrapped = new Error(`${cmd} failed: ${err.slice(0, 800)}`);
    wrapped.status = res.status;
    throw wrapped;
  }
  return res;
}

function normalizeSql(sql) {
  return String(sql || "")
    .replace(/\b(public|pg_catalog)\./gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hashRows(rows, fields) {
  const hash = crypto.createHash("sha256");
  for (const row of rows) {
    hash.update(
      fields
        .map((f) => {
          const value = row[f] ?? "";
          return f === "def" ? normalizeSql(value) : String(value);
        })
        .join("\t")
    );
    hash.update("\n");
  }
  return hash.digest("hex");
}

async function inventory(client, schema = "arc") {
  await client.query("SET statement_timeout = 0");
  await client.query("SET work_mem = '64MB'");

  const ext = await client.query(
    `SELECT extname, extversion
     FROM pg_extension
     WHERE extname = ANY($1::text[])
     ORDER BY 1`,
    [["citext", "pg_trgm", "pgcrypto", "plpgsql"]]
  );
  const tables = await client.query(
    `SELECT c.relname AS name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relkind IN ('r', 'p')
     ORDER BY 1`,
    [schema]
  );
  const sequences = await client.query(
    `SELECT sequencename AS name, last_value::text AS last_value
     FROM pg_sequences
     WHERE schemaname = $1
     ORDER BY 1`,
    [schema]
  );
  const constraints = await client.query(
    `SELECT c.conname AS name, c.contype::text AS contype, pg_get_constraintdef(c.oid) AS def
     FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = $1
     ORDER BY 1, 2, 3`,
    [schema]
  );
  const indexes = await client.query(
    `SELECT indexname AS name, indexdef AS def
     FROM pg_indexes
     WHERE schemaname = $1
     ORDER BY 1, 2`,
    [schema]
  );

  const tableStats = [];
  for (const { name } of tables.rows) {
    const quoted = await client.query("SELECT quote_ident($1) AS q", [name]);
    const ident = quoted.rows[0].q;
    const countRes = await client.query(`SELECT COUNT(*)::bigint AS n FROM ${schema}.${ident}`);
    const hashRes = await client.query(
      `SELECT encode(
         sha256(
           convert_to(
             COALESCE(string_agg(md5(t::text), E'\\n' ORDER BY md5(t::text)), ''),
             'UTF8'
           )
         ),
         'hex'
       ) AS h
       FROM ${schema}.${ident} t`
    );
    tableStats.push({
      name,
      count: Number(countRes.rows[0].n),
      dataSha256: hashRes.rows[0].h,
    });
  }

  const dataManifest = tableStats.map((t) => `${t.name}\t${t.count}\t${t.dataSha256}`).join("\n");
  return {
    schema,
    extensions: ext.rows,
    tables: tableStats,
    tableCount: tableStats.length,
    rowCount: tableStats.reduce((n, t) => n + t.count, 0),
    dataSha256: sha256Text(dataManifest + "\n"),
    sequences: sequences.rows.map((s) => ({
      name: s.name,
      lastValue: String(s.last_value ?? ""),
    })),
    constraintCount: constraints.rows.length,
    foreignKeyCount: constraints.rows.filter((c) => c.contype === "f").length,
    constraintsSha256: hashRows(constraints.rows, ["name", "contype", "def"]),
    constraintNames: constraints.rows.map((c) => c.name),
    indexCount: indexes.rows.length,
    indexesSha256: hashRows(indexes.rows, ["name", "def"]),
    indexNames: indexes.rows.map((i) => i.name),
  };
}

function compareInventories(source, restored) {
  const mismatches = [];
  if (source.schema !== restored.schema) {
    mismatches.push({ issue: "schema", source: source.schema, restored: restored.schema });
  }
  const srcExt = new Set(source.extensions.map((e) => e.extname));
  for (const name of ["citext", "pg_trgm", "pgcrypto"]) {
    if (!srcExt.has(name)) mismatches.push({ issue: "source_missing_extension", name });
    if (!restored.extensions.some((e) => e.extname === name)) {
      mismatches.push({ issue: "restore_missing_extension", name });
    }
  }
  const srcTables = Object.fromEntries(source.tables.map((t) => [t.name, t]));
  const dstTables = Object.fromEntries(restored.tables.map((t) => [t.name, t]));
  for (const name of Object.keys(srcTables)) {
    const a = srcTables[name];
    const b = dstTables[name];
    if (!b) {
      mismatches.push({ issue: "missing_table", name, sourceCount: a.count });
      continue;
    }
    if (a.count !== b.count || a.dataSha256 !== b.dataSha256) {
      mismatches.push({
        issue: "count_or_checksum",
        name,
        sourceCount: a.count,
        restoreCount: b.count,
        checksumMatch: a.dataSha256 === b.dataSha256,
      });
    }
  }
  for (const name of Object.keys(dstTables)) {
    if (!srcTables[name]) mismatches.push({ issue: "unexpected_table", name });
  }
  const srcConNames = [...(source.constraintNames || [])].sort().join("\n");
  const dstConNames = [...(restored.constraintNames || [])].sort().join("\n");
  const constraintNamesMatch = srcConNames === dstConNames;
  const constraintCountsMatch =
    source.constraintCount === restored.constraintCount &&
    source.foreignKeyCount === restored.foreignKeyCount;
  // pg_get_constraintdef quoting can differ after pg_restore; names+counts
  // are the restore contract. Normalized defs are still stored for later dumps.
  if (!constraintCountsMatch || !constraintNamesMatch) {
    mismatches.push({
      issue: "constraints",
      sourceCount: source.constraintCount,
      restoreCount: restored.constraintCount,
      sourceFk: source.foreignKeyCount,
      restoreFk: restored.foreignKeyCount,
      namesMatch: constraintNamesMatch,
    });
  }
  const srcIdxNames = [...(source.indexNames || [])].sort().join("\n");
  const dstIdxNames = [...(restored.indexNames || [])].sort().join("\n");
  const indexNamesMatch = srcIdxNames === dstIdxNames;
  if (source.indexCount !== restored.indexCount || !indexNamesMatch) {
    mismatches.push({
      issue: "indexes",
      sourceCount: source.indexCount,
      restoreCount: restored.indexCount,
      namesMatch: indexNamesMatch,
    });
  }
  const srcSeq = Object.fromEntries(source.sequences.map((s) => [s.name, s]));
  const dstSeq = Object.fromEntries(restored.sequences.map((s) => [s.name, s]));
  for (const name of Object.keys(srcSeq)) {
    const a = srcSeq[name];
    const b = dstSeq[name];
    if (!b) {
      mismatches.push({ issue: "missing_sequence", name });
      continue;
    }
    if (a.lastValue !== b.lastValue) {
      mismatches.push({ issue: "sequence_value", name });
    }
  }
  for (const name of Object.keys(dstSeq)) {
    if (!srcSeq[name]) mismatches.push({ issue: "unexpected_sequence", name });
  }
  if (source.dataSha256 !== restored.dataSha256) {
    mismatches.push({ issue: "global_data_checksum" });
  }
  return mismatches;
}

module.exports = {
  die,
  redact,
  sha256File,
  sha256Text,
  sessionPoolerUrl,
  pgEnvFromUrl,
  run,
  inventory,
  compareInventories,
};
