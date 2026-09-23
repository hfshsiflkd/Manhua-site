#!/usr/bin/env node
"use strict";

/**
 * Compare isolated Mongo source to a Postgres target without printing PII.
 */
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const { Client } = require("pg");
const {
  loadExplicitEnv,
  envFileFromArgv,
  parseEnvFile,
  assertPostgresTarget,
  assertIsolatedMongo,
  resolvePostgresUrlFromValues,
  describePgTarget,
  pgClientConfig,
} = require("./loadExplicitEnv");

const file = envFileFromArgv();
if (file) {
  const parsed = parseEnvFile(file);
  loadExplicitEnv(file, { override: true });
  const fromFile = resolvePostgresUrlFromValues(parsed.values);
  if (fromFile) process.env.DATABASE_URL = fromFile;
  else if (/supabase/i.test(file)) {
    console.error(JSON.stringify({ ok: false, reason: "DATABASE_URL_or_DIRECT_missing" }));
    process.exit(2);
  }
}

assertIsolatedMongo(process.env.MIGRATE_MONGO_URI);
assertPostgresTarget(process.env.DATABASE_URL);

async function classifyExtras(pg, table, extraIds) {
  const empty = { placeholder: 0, testArtifact: 0, unexplained: 0 };
  if (!extraIds.length) return empty;
  let sql = null;
  if (table === "manhuas") {
    sql = `SELECT
      count(*) FILTER (WHERE extra->>'quarantinePlaceholder' = 'true')::int AS placeholder,
      count(*) FILTER (WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')::int AS test
      FROM arc.manhuas WHERE id = ANY($1)`;
  } else if (table === "chapters") {
    sql = `SELECT
      count(*) FILTER (
        WHERE c.extra->>'quarantinePlaceholder' = 'true'
           OR m.extra->>'quarantinePlaceholder' = 'true'
           OR c.extra->>'hiddenBecauseParentDeleted' = 'true'
      )::int AS placeholder,
      count(*) FILTER (WHERE c.extra->>'pgitest' = 'true')::int AS test
      FROM arc.chapters c
      JOIN arc.manhuas m ON m.id = c.manhua_id
      WHERE c.id = ANY($1)`;
  } else if (table === "users") {
    sql = `SELECT
      0 AS placeholder,
      count(*) FILTER (
        WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local' OR username LIKE 'pgit%'
      )::int AS test
      FROM arc.users WHERE id = ANY($1)`;
  } else if (table === "favorites") {
    sql = `SELECT
      count(*) FILTER (WHERE m.extra->>'quarantinePlaceholder' = 'true')::int AS placeholder,
      count(*) FILTER (
        WHERE f.mongo_v IS NULL
           OR f.extra->>'pgitest' = 'true'
           OR m.extra->>'pgitest' = 'true'
           OR u.email LIKE '%@pgitest.local'
           OR u.username LIKE 'pgit%'
      )::int AS test
      FROM arc.favorites f
      JOIN arc.manhuas m ON m.id = f.manhua_id
      JOIN arc.users u ON u.id = f.user_id
      WHERE f.id = ANY($1)`;
  } else if (table === "audit_logs") {
    sql = `SELECT 0 AS placeholder, count(*)::int AS test FROM arc.audit_logs WHERE id = ANY($1)`;
  } else if (table === "finance_months") {
    sql = `SELECT 0 AS placeholder, count(*)::int AS test FROM arc.finance_months WHERE id = ANY($1)`;
  }
  if (!sql) {
    return { ...empty, unexplained: extraIds.length };
  }
  const r = await pg.query(sql, [extraIds]);
  const placeholder = Number(r.rows[0].placeholder || 0);
  const testArtifact = Number(r.rows[0].test || 0);
  return {
    placeholder,
    testArtifact,
    unexplained: Math.max(0, extraIds.length - placeholder - testArtifact),
  };
}

function checksum(ids) {
  const h = crypto.createHash("sha256");
  for (const id of ids.slice().sort()) h.update(String(id));
  return h.digest("hex").slice(0, 16);
}

const MAP = [
  ["users", "users"],
  ["manhuas", "manhuas"],
  ["chapters", "chapters"],
  ["favorites", "favorites"],
  ["bookmarks", "reading_bookmarks"],
  ["comments", "comments"],
  ["teams", "teams"],
  ["teaminvites", "team_invites"],
  ["requests", "requests"],
  ["feedbacks", "feedback"],
  ["vipplans", "vip_plans"],
  ["financemonths", "finance_months"],
  ["appsettings", "app_settings"],
  ["trialdevices", "trial_devices"],
  ["editormonthstats", "editor_month_stats"],
  ["editormanhuamonthstats", "editor_manhua_month_stats"],
  ["chapterreads", "chapter_reads"],
  ["chapterreadmonths", "chapter_read_months"],
  ["auditlogs", "audit_logs"],
  ["actionlogs", "action_logs"],
  ["registerattempts", "register_attempts"],
];

async function main() {
  const mongo = new MongoClient(process.env.MIGRATE_MONGO_URI);
  const pg = new Client(pgClientConfig(process.env.DATABASE_URL));
  await mongo.connect();
  await pg.connect();
  const db = mongo.db();
  const diffs = [];
  const rows = [];

  for (const [coll, table] of MAP) {
    const mongoDocs = await db.collection(coll).find({}, { projection: { _id: 1 } }).toArray();
    const mongoIds = mongoDocs.map((d) => String(d._id));
    const pgRes = await pg.query(`SELECT id FROM arc.${table}`);
    const pgIds = pgRes.rows.map((r) => r.id);
    const mongoSet = new Set(mongoIds);
    const pgSet = new Set(pgIds);
    const missingInPg = mongoIds.filter((id) => !pgSet.has(id));
    const extraIds = pgIds.filter((id) => !mongoSet.has(id));
    const extraClass = await classifyExtras(pg, table, extraIds);
    const row = {
      collection: coll,
      table,
      mongo: mongoIds.length,
      postgres: pgIds.length,
      mongoChecksum: checksum(mongoIds),
      postgresSourceChecksum: checksum(pgIds.filter((id) => mongoSet.has(id))),
      missingInPg: missingInPg.length,
      extraInPg: extraIds.length,
      extraPlaceholder: extraClass.placeholder,
      extraTestArtifact: extraClass.testArtifact,
      extraUnexplained: extraClass.unexplained,
    };
    rows.push(row);
    if (missingInPg.length || extraClass.unexplained) {
      diffs.push({
        collection: coll,
        missingInPg: missingInPg.length,
        extraUnexplained: extraClass.unexplained,
      });
    }
  }

  const views = await pg.query(`
    SELECT
      (SELECT coalesce(sum(views),0)::bigint FROM arc.manhuas WHERE extra->>'quarantinePlaceholder' IS DISTINCT FROM 'true') AS manhua_views,
      (SELECT coalesce(sum(views),0)::bigint FROM arc.chapters WHERE extra->>'quarantinePlaceholder' IS DISTINCT FROM 'true') AS chapter_views,
      (SELECT count(*)::int FROM arc.chapter_pages) AS pages,
      (SELECT count(*)::int FROM arc.manhuas WHERE extra->>'quarantinePlaceholder'='true') AS placeholder_manhuas,
      (SELECT count(*)::int FROM arc.chapters WHERE extra->>'quarantinePlaceholder'='true') AS placeholder_chapters,
      (SELECT count(*)::int FROM arc.manhuas WHERE deleted_at IS NULL) AS manhuas_public,
      (SELECT count(*)::int FROM arc.chapters WHERE deleted_at IS NULL) AS chapters_public,
      (SELECT count(*)::int FROM arc.chapters c
        JOIN arc.manhuas m ON m.id = c.manhua_id
        WHERE m.deleted_at IS NOT NULL AND c.deleted_at IS NULL AND c.status = 'published') AS published_on_deleted_parent
  `);

  const mongoManhuaViews = await db.collection("manhuas").aggregate([{ $group: { _id: null, n: { $sum: "$views" } } }]).toArray();
  const mongoChapterViews = await db.collection("chapters").aggregate([{ $group: { _id: null, n: { $sum: "$views" } } }]).toArray();
  const mongoPages = await db.collection("chapters").aggregate([
    { $project: { n: { $size: { $ifNull: ["$pages", []] } } } },
    { $group: { _id: null, n: { $sum: "$n" } } },
  ]).toArray();

  const viewDiff = {
    manhuaViewsMongo: mongoManhuaViews[0]?.n || 0,
    manhuaViewsPg: Number(views.rows[0].manhua_views),
    chapterViewsMongo: mongoChapterViews[0]?.n || 0,
    chapterViewsPg: Number(views.rows[0].chapter_views),
    pagesMongo: mongoPages[0]?.n || 0,
    pagesPg: views.rows[0].pages,
  };

  const report = {
    ok:
      diffs.length === 0 &&
      viewDiff.manhuaViewsMongo === viewDiff.manhuaViewsPg &&
      viewDiff.chapterViewsMongo === viewDiff.chapterViewsPg &&
      viewDiff.pagesMongo === viewDiff.pagesPg &&
      Number(views.rows[0].published_on_deleted_parent) === 0,
    target: describePgTarget(process.env.DATABASE_URL).kind,
    note: "extraPlaceholder and extraTestArtifact are excluded from migration diffs",
    counts: rows,
    diffs,
    views: viewDiff,
    placeholders: {
      manhuas: views.rows[0].placeholder_manhuas,
      chapters: views.rows[0].placeholder_chapters,
      publicManhuas: views.rows[0].manhuas_public,
      publicChapters: views.rows[0].chapters_public,
      publishedOnDeletedParent: views.rows[0].published_on_deleted_parent,
    },
  };
  console.log(JSON.stringify(report, null, 2));
  await mongo.close();
  await pg.end();
  if (!report.ok) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
