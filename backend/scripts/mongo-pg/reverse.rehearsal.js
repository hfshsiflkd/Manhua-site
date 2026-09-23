#!/usr/bin/env node
"use strict";

/**
 * Isolated-only rehearsal:
 * 1) Truncating resync removes stale PG rows that upsert would keep.
 * 2) PG→Mongo reverse copies post-cutover create/update/delete, hashes, finance,
 *    and relations, and does not invent placeholder documents.
 *
 * Does not touch production Mongo, Vercel, or hosted Supabase.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
const { Client } = require("pg");
const { spawnSync } = require("child_process");
const {
  parseEnvFile,
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
  assertPostgresTarget,
  assertIsolatedMongo,
} = require("./loadExplicitEnv");

function parseDotenv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1);
  }
  return out;
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function runNode(script, extraEnv) {
  const result = spawnSync(process.execPath, [script], {
    cwd: path.join(__dirname, "../.."),
    env: extraEnv,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) die(`${script} failed with ${result.status}`);
  return result;
}

async function main() {
  const isolatedCandidates = [
    path.join(os.homedir(), "Library/Application Support/arc-read-db-backups/pg-isolated.env"),
    path.join(__dirname, "../../.env.pg-isolated"),
  ];
  let isolated = {};
  for (const file of isolatedCandidates) {
    isolated = parseDotenv(file);
    if (isolated.DATABASE_URL) break;
  }
  if (!isUsablePostgresUrl(isolated.DATABASE_URL)) die("isolated DATABASE_URL missing");
  const pgUri = isolated.DATABASE_URL;
  const meta = describePgTarget(pgUri);
  if (meta.kind !== "isolated-local") die("rehearsal requires isolated Docker Postgres");
  assertPostgresTarget(pgUri);

  const sourceMongo = "mongodb://127.0.0.1:27018/test?directConnection=true";
  const reverseMongo = "mongodb://127.0.0.1:27018/arc_reverse_rehearsal?directConnection=true";
  assertIsolatedMongo(sourceMongo);
  assertIsolatedMongo(reverseMongo);

  const env = {
    ...process.env,
    DATABASE_URL: pgUri,
    MIGRATE_TARGET: "isolated",
    MIGRATE_MONGO_URI: sourceMongo,
    ORPHAN_MODE: "placeholder",
    REVERSE_MONGO_URI: reverseMongo,
  };
  delete env.MONGO_URI;
  delete env.MONGODB_URI;
  delete env.DB_DRIVER;
  delete env.ALLOW_SUPABASE_MIGRATE;

  console.log(JSON.stringify({ rehearsal: true, pg: { host: meta.host, port: meta.port } }));

  const pg = new Client(pgClientConfig(pgUri));
  await pg.connect();

  await pg.query(
    `INSERT INTO arc.manhuas (
      id, title, slug, rating, status, created_by, views, weekly_views, extra, created_at, updated_at
    )
    SELECT 'ffffffffffffffffffffffff', 'stale-upsert-row', 'stale-upsert-row', 0, 'ongoing', id, 0, 0,
           '{"staleSync":true}'::jsonb, now(), now()
    FROM arc.users ORDER BY created_at ASC LIMIT 1
    ON CONFLICT (id) DO NOTHING`
  );
  const staleBefore = await pg.query(`SELECT 1 FROM arc.manhuas WHERE id='ffffffffffffffffffffffff'`);
  if (!staleBefore.rowCount) die("failed to insert stale row");

  console.log("=== truncating resync (isolated) ===");
  runNode(path.join(__dirname, "migrate.js"), env);
  const staleAfter = await pg.query(`SELECT 1 FROM arc.manhuas WHERE id='ffffffffffffffffffffffff'`);
  if (staleAfter.rowCount) die("stale upsert row survived truncating resync");
  runNode(path.join(__dirname, "verify-source-target.js"), env);

  const creator = await pg.query(`SELECT id FROM arc.users ORDER BY created_at ASC LIMIT 1`);
  const realManhua = await pg.query(
    `SELECT id, title FROM arc.manhuas
     WHERE extra->>'quarantinePlaceholder' IS DISTINCT FROM 'true' AND deleted_at IS NULL
     ORDER BY created_at ASC LIMIT 1`
  );
  const realComment = await pg.query(`SELECT id FROM arc.comments ORDER BY created_at ASC LIMIT 1`);
  if (!creator.rowCount || !realManhua.rowCount) die("isolated PG missing base rows");

  const userId = crypto.randomBytes(12).toString("hex");
  const favId = crypto.randomBytes(12).toString("hex");
  const financeId = crypto.randomBytes(12).toString("hex");
  const passwordHash = await bcrypt.hash("Reverse-rehearse-9x", 10);
  const originalTitle = realManhua.rows[0].title;
  const manhuaId = realManhua.rows[0].id;
  const deletedCommentId = realComment.rows[0]?.id || null;

  await pg.query(
    `INSERT INTO arc.users (
      id, username, email, phone, password_hash, role, is_active, blocked, is_vip, extra, created_at, updated_at
    ) VALUES (
      $1,'reverse_rehearse','reverse.rehearse@pgitest.local','',$2,'user',true,false,false,
      '{"reverseRehearsal":true}'::jsonb, now(), now()
    )`,
    [userId, passwordHash]
  );
  await pg.query(`UPDATE arc.manhuas SET title=$2, updated_at=now() WHERE id=$1`, [
    manhuaId,
    `REHEARSED ${originalTitle}`,
  ]);
  await pg.query(
    `INSERT INTO arc.favorites (id, user_id, manhua_id, extra, created_at, updated_at)
     VALUES ($1,$2,$3,'{"reverseRehearsal":true}'::jsonb, now(), now())`,
    [favId, userId, manhuaId]
  );
  await pg.query(
    `INSERT INTO arc.finance_months (id, month_key, total_revenue, currency, extra, created_at, updated_at)
     VALUES ($1,'2099-01',1234.56,'MNT','{"reverseRehearsal":true}'::jsonb, now(), now())`,
    [financeId]
  );
  await pg.query(
    `INSERT INTO arc.finance_revenue_events (
      finance_month_id, position, user_id, admin_id, amount, currency, paid_at, months_granted, note
    ) VALUES ($1,0,$2,$2,1234.56,'MNT', now(), 1, 'reverse-rehearsal')`,
    [financeId, userId]
  );
  if (deletedCommentId) {
    await pg.query(`DELETE FROM arc.comments WHERE id=$1`, [deletedCommentId]);
  }

  const reverseClient = new MongoClient(reverseMongo);
  await reverseClient.connect();
  await reverseClient.db().dropDatabase();
  await reverseClient.close();

  console.log("=== PG→Mongo reverse ===");
  runNode(path.join(__dirname, "reverse.js"), env);

  const check = new MongoClient(reverseMongo);
  await check.connect();
  const rdb = check.db();
  const newUser = await rdb.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!newUser) die("reverse missing created user");
  if (newUser.password !== passwordHash) die("password hash was rehashed or altered");
  if (!/^\$2[aby]\$/.test(newUser.password)) die("password is not a bcrypt hash");
  const updated = await rdb.collection("manhuas").findOne({ _id: new ObjectId(manhuaId) });
  if (!updated || updated.title !== `REHEARSED ${originalTitle}`) die("updated manhua title missing");
  const fav = await rdb.collection("favorites").findOne({ _id: new ObjectId(favId) });
  if (!fav || String(fav.user) !== userId || String(fav.manhua) !== manhuaId) die("favorite relation missing");
  const fin = await rdb.collection("financemonths").findOne({ monthKey: "2099-01" });
  if (!fin || Number(fin.totalRevenue) !== 1234.56) die("finance totalRevenue mismatch");
  if (!Array.isArray(fin.revenueEvents) || Number(fin.revenueEvents[0]?.amount) !== 1234.56) {
    die("finance event amount mismatch");
  }
  if (deletedCommentId) {
    const gone = await rdb.collection("comments").findOne({ _id: new ObjectId(deletedCommentId) });
    if (gone) die("deleted comment was resurrected");
  }
  const phManhua = await rdb.collection("manhuas").findOne({ _id: new ObjectId("bbbbbbbbbbbbbbbbbbbbbb01") });
  if (phManhua) die("placeholder manhua leaked into Mongo");
  const phSlug = await rdb.collection("manhuas").findOne({ slug: /^quarantine-missing-/ });
  if (phSlug) die("placeholder slug leaked into Mongo");
  const phChapter = await rdb.collection("chapters").countDocuments({
    _id: {
      $in: [
        "6970f8cf489abff4a42702cf",
        "69727637489abff4a4270fe9",
      ].map((id) => new ObjectId(id)),
    },
  });
  if (phChapter) die("placeholder chapters leaked into Mongo");

  const realOnPlaceholder = await pg.query(
    `SELECT c.id, c.manhua_id,
            (SELECT count(*)::int FROM arc.chapter_pages p WHERE p.chapter_id = c.id) AS pages,
            (SELECT count(*)::int FROM arc.chapter_read_months r WHERE r.chapter_id = c.id) AS reads
     FROM arc.chapters c
     JOIN arc.manhuas m ON m.id = c.manhua_id
     WHERE m.extra->>'quarantinePlaceholder' = 'true'
       AND coalesce(c.extra->>'quarantinePlaceholder','') <> 'true'`
  );
  if (!realOnPlaceholder.rowCount) die("expected a real chapter on a placeholder manhua");
  for (const row of realOnPlaceholder.rows) {
    const chapter = await rdb.collection("chapters").findOne({ _id: new ObjectId(row.id) });
    if (!chapter) die(`real chapter ${row.id} on placeholder parent missing from reverse`);
    if ((chapter.pages || []).length !== Number(row.pages)) {
      die(`real chapter ${row.id} page count ${ (chapter.pages || []).length} != ${row.pages}`);
    }
    const reads = await rdb.collection("chapterreadmonths").countDocuments({
      chapterId: new ObjectId(row.id),
    });
    if (reads !== Number(row.reads)) die(`real chapter ${row.id} read-months ${reads} != ${row.reads}`);
    const parent = await rdb.collection("manhuas").findOne({ _id: new ObjectId(row.manhua_id) });
    if (parent) die("placeholder parent manhua was invented in Mongo");
  }

  const danglingReads = await pg.query(
    `SELECT r.id, r.chapter_id FROM arc.chapter_read_months r
     JOIN arc.chapters c ON c.id = r.chapter_id
     WHERE c.extra->>'quarantinePlaceholder' = 'true'`
  );
  for (const row of danglingReads.rows) {
    const read = await rdb.collection("chapterreadmonths").findOne({ _id: new ObjectId(row.id) });
    if (!read) die(`dangling read ${row.id} missing from reverse`);
    const ph = await rdb.collection("chapters").findOne({ _id: new ObjectId(row.chapter_id) });
    if (ph) die("synthetic placeholder chapter leaked via dangling read");
  }

  const favOnPh = await pg.query(
    `SELECT f.id FROM arc.favorites f
     JOIN arc.manhuas m ON m.id = f.manhua_id
     WHERE m.extra->>'quarantinePlaceholder' = 'true'`
  );
  for (const row of favOnPh.rows) {
    if (!(await rdb.collection("favorites").findOne({ _id: new ObjectId(row.id) }))) {
      die(`favorite ${row.id} on placeholder manhua missing from reverse`);
    }
  }
  const statOnPh = await pg.query(
    `SELECT s.id FROM arc.editor_manhua_month_stats s
     JOIN arc.manhuas m ON m.id = s.manhua_id
     WHERE m.extra->>'quarantinePlaceholder' = 'true'`
  );
  for (const row of statOnPh.rows) {
    if (!(await rdb.collection("editormanhuamonthstats").findOne({ _id: new ObjectId(row.id) }))) {
      die(`editor manhua stat ${row.id} missing from reverse`);
    }
  }
  const reverseCounts = {
    users: await rdb.collection("users").countDocuments(),
    chapters: await rdb.collection("chapters").countDocuments(),
    chapterreadmonths: await rdb.collection("chapterreadmonths").countDocuments(),
  };
  await check.close();

  const switchMongo = "mongodb://127.0.0.1:27018/arc_rollback_switch?directConnection=true";
  assertIsolatedMongo(switchMongo);
  console.log("=== copy reverse db into new isolated db (does not overwrite test) ===");
  const switched = new MongoClient(switchMongo);
  await switched.connect();
  await switched.db().dropDatabase();
  const sdb = switched.db();
  const sourceCopy = new MongoClient(reverseMongo);
  await sourceCopy.connect();
  const srcDb = sourceCopy.db();
  const collNames = (await srcDb.listCollections().toArray()).map((c) => c.name);
  for (const name of collNames) {
    const docs = await srcDb.collection(name).find().toArray();
    if (docs.length) await sdb.collection(name).insertMany(docs);
  }
  await sourceCopy.close();
  const switchCounts = {
    users: await sdb.collection("users").countDocuments(),
    chapters: await sdb.collection("chapters").countDocuments(),
    chapterreadmonths: await sdb.collection("chapterreadmonths").countDocuments(),
  };
  if (switchCounts.users !== reverseCounts.users || switchCounts.chapters !== reverseCounts.chapters) {
    die(`new-db restore counts mismatch ${JSON.stringify({ reverseCounts, switchCounts })}`);
  }
  if (await sdb.collection("manhuas").findOne({ _id: new ObjectId("bbbbbbbbbbbbbbbbbbbbbb01") })) {
    die("placeholder manhua present in switched db");
  }
  await switched.close();

  console.log("=== restore isolated PG from source Mongo ===");
  runNode(path.join(__dirname, "migrate.js"), env);
  runNode(path.join(__dirname, "verify-source-target.js"), env);

  const restoredTitle = await pg.query(`SELECT title FROM arc.manhuas WHERE id=$1`, [manhuaId]);
  if (restoredTitle.rows[0].title !== originalTitle) die("isolated PG title did not restore after remigrate");
  const leftoverUser = await pg.query(`SELECT 1 FROM arc.users WHERE id=$1`, [userId]);
  if (leftoverUser.rowCount) die("rehearsal user remained after truncating resync");

  await pg.end();
  console.log(
    JSON.stringify({
      ok: true,
      truncatingResyncRemovedStaleRow: true,
      reverseCopiedCreateUpdateDelete: true,
      passwordHashPreserved: true,
      financeAmount: 1234.56,
      placeholdersExcludedFromMongo: true,
      realRowsOnPlaceholderParentsKept: true,
      restoredToNewDatabase: true,
      isolatedPgRestored: true,
    })
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
