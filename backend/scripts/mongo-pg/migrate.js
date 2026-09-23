#!/usr/bin/env node
"use strict";

/**
 * Mongo → Postgres migrator.
 * Refuses remote/production targets unless explicit isolated flags are set.
 *
 *   MIGRATE_TARGET=isolated \
 *   MIGRATE_MONGO_URI=mongodb://127.0.0.1:27018/test?directConnection=true \
 *   DATABASE_URL=postgres://arc:...@127.0.0.1:55432/arc_isolated \
 *   node backend/scripts/mongo-pg/migrate.js [--dry-run]
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { Client } = require("pg");
const { EXPECTED } = require("./expectedCollections");
const {
  loadExplicitEnv,
  envFileFromArgv,
  parseEnvFile,
  assertIsolatedMongo,
  assertPostgresTarget,
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
} = require("./loadExplicitEnv");

const envFile = envFileFromArgv();
if (envFile) {
  const parsed = parseEnvFile(envFile);
  loadExplicitEnv(envFile, { override: true });
  const fromFile = [parsed.values.DATABASE_URL_DIRECT, parsed.values.DATABASE_URL].find(isUsablePostgresUrl);
  if (fromFile) process.env.DATABASE_URL = fromFile;
  else if (/supabase/i.test(envFile)) {
    console.error(
      JSON.stringify({
        ok: false,
        reason: "DATABASE_URL_or_DIRECT_missing",
        hint: "Paste hosted pooler/direct URLs into the explicit env file before migrate.",
      })
    );
    process.exit(2);
  }
}

const DRY = process.argv.includes("--dry-run");
const BATCH = Number(process.env.MIGRATE_BATCH || 200);
const ORPHAN_MODE =
  process.env.ORPHAN_MODE ||
  (process.argv.includes("--orphan-mode=placeholder") ? "placeholder" : "quarantine");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function assertIsolated() {
  if (process.env.MIGRATE_TARGET !== "isolated" && process.env.MIGRATE_TARGET !== "hosted-staging") {
    die("refusing to run: set MIGRATE_TARGET=isolated or hosted-staging");
  }
  const mongoUri = process.env.MIGRATE_MONGO_URI || "";
  const pgUri = process.env.DATABASE_URL || "";
  try {
    assertIsolatedMongo(mongoUri);
    const target = describePgTarget(pgUri);
    console.log(JSON.stringify({ migrateTarget: target }));
    assertPostgresTarget(pgUri);
  } catch (err) {
    die(err.message);
  }
}

function oid(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function ts(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function num(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function extraOf(doc, known) {
  const extra = {};
  for (const [k, v] of Object.entries(doc)) {
    if (!known.includes(k)) extra[k] = v;
  }
  return extra;
}

function mapEntries(mapLike) {
  if (!mapLike) return [];
  if (mapLike instanceof Map) return [...mapLike.entries()];
  if (typeof mapLike === "object") return Object.entries(mapLike);
  return [];
}

async function main() {
  assertIsolated();
  const report = {
    startedAt: new Date().toISOString(),
    dryRun: DRY,
    orphanMode: ORPHAN_MODE,
    phases: [],
    quarantine: 0,
    hiddenChaptersBecauseParentDeleted: 0,
    truncatedTarget: false,
    ok: true,
    insertMode: "batch",
    phaseMs: {},
  };
  console.log(`orphanMode=${ORPHAN_MODE}`);

  const mongo = new MongoClient(process.env.MIGRATE_MONGO_URI);
  const pg = new Client(pgClientConfig(process.env.DATABASE_URL));
  await mongo.connect();
  await pg.connect();
  await pg.query("SET statement_timeout = 0");
  await pg.query("SET idle_in_transaction_session_timeout = 0");
  const db = mongo.db();
  const knownUsers = new Set();
  const knownManhuas = new Set();
  const knownChapters = new Set();

  function makeBatch(head, tail = "") {
    const rows = [];
    async function flush() {
      if (!rows.length) return;
      const batch = rows.splice(0);
      if (DRY) return;
      const params = [];
      const values = [];
      let i = 1;
      for (const row of batch) {
        values.push(`(${row.map(() => `$${i++}`).join(",")})`);
        params.push(...row);
      }
      await pg.query(`${head} VALUES ${values.join(",")} ${tail}`, params);
    }
    async function push(row) {
      if (DRY) return;
      rows.push(row);
      if (rows.length >= BATCH) await flush();
    }
    return { push, flush };
  }

  async function checkpoint(id, status, detail) {
    if (DRY) return;
    await pg.query(
      `INSERT INTO arc.migration_checkpoints (id, phase, status, detail, updated_at)
       VALUES ($1,$2,$3,$4::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, detail=EXCLUDED.detail, updated_at=now()`,
      [id, id, status, JSON.stringify(detail)]
    );
  }

  async function quarantine(collectionName, documentId, reason, payload) {
    report.quarantine += 1;
    report.ok = false;
    report.phases.push({ collectionName, documentId, reason });
    if (DRY) return;
    await pg.query(
      `INSERT INTO arc.migration_quarantine (collection_name, document_id, reason, payload)
       VALUES ($1,$2,$3,$4::jsonb)`,
      [collectionName, documentId || null, reason, JSON.stringify(payload)]
    );
  }

  async function userExists(id) {
    if (!id) return false;
    if (knownUsers.has(id)) return true;
    const r = await pg.query("SELECT 1 FROM arc.users WHERE id=$1", [id]);
    if (r.rowCount) knownUsers.add(id);
    return r.rowCount > 0;
  }
  async function manhuaExists(id) {
    if (!id) return false;
    if (knownManhuas.has(id)) return true;
    const r = await pg.query("SELECT 1 FROM arc.manhuas WHERE id=$1", [id]);
    if (r.rowCount) knownManhuas.add(id);
    return r.rowCount > 0;
  }
  async function chapterExists(id) {
    if (!id) return false;
    if (knownChapters.has(id)) return true;
    const r = await pg.query("SELECT 1 FROM arc.chapters WHERE id=$1", [id]);
    if (r.rowCount) knownChapters.add(id);
    return r.rowCount > 0;
  }

  let placeholderCreatorId = null;
  async function firstUserId() {
    if (placeholderCreatorId) return placeholderCreatorId;
    const r = await pg.query("SELECT id FROM arc.users ORDER BY created_at ASC LIMIT 1");
    placeholderCreatorId = r.rows[0]?.id || null;
    return placeholderCreatorId;
  }

  async function ensurePlaceholderManhua(manhuaId, source) {
    if (!manhuaId) return false;
    if (await manhuaExists(manhuaId)) return true;
    if (ORPHAN_MODE !== "placeholder") return false;
    const createdBy = await firstUserId();
    if (!createdBy) return false;
    if (DRY) return true;
    await pg.query(
      `INSERT INTO arc.manhuas (
        id, title, title_en, slug, rating, description, status, created_by,
        views, weekly_views, deleted_at, extra, created_at, updated_at
      ) VALUES (
        $1, $2, '', $3, 0, $4, 'hiatus', $5, 0, 0, now(), $6::jsonb, now(), now()
      ) ON CONFLICT (id) DO NOTHING`,
      [
        manhuaId,
        "[quarantine] missing source manhua",
        `quarantine-missing-${manhuaId}`,
        "Soft-deleted placeholder for orphaned Mongo documents. Hidden from public lists.",
        createdBy,
        JSON.stringify({ quarantinePlaceholder: true, source }),
      ]
    );
    knownManhuas.add(manhuaId);
    return true;
  }

  async function ensurePlaceholderChapter(chapterId, source) {
    if (!chapterId) return false;
    if (await chapterExists(chapterId)) return true;
    if (ORPHAN_MODE !== "placeholder") return false;
    const parentId = "bbbbbbbbbbbbbbbbbbbbbb01";
    if (!(await ensurePlaceholderManhua(parentId, "dangling-chapter-parent"))) return false;
    if (DRY) return true;
    await pg.query(
      `INSERT INTO arc.chapters (
        id, manhua_id, chapter_number, title, language, status, views, uploaded_by,
        deleted_at, extra, created_at, updated_at
      ) VALUES (
        $1, $2, 0, $3, 'mn', 'draft', 0, null, now(), $4::jsonb, now(), now()
      ) ON CONFLICT (id) DO NOTHING`,
      [
        chapterId,
        parentId,
        "[quarantine] missing source chapter",
        JSON.stringify({ quarantinePlaceholder: true, source }),
      ]
    );
    knownChapters.add(chapterId);
    return true;
  }

  async function each(name, handler) {
    const coll = db.collection(name);
    const total = await coll.countDocuments();
    let processed = 0;
    const t0 = Date.now();
    const cursor = coll.find({}).batchSize(BATCH);
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      await handler(doc);
      processed += 1;
    }
    const ms = Date.now() - t0;
    report.phaseMs[name] = ms;
    await checkpoint(name, "done", { total, processed, ms });
    console.log(`${name}\t${processed}/${total}\t${ms}ms`);
    return { total, processed, ms };
  }

  const USER_PROFILE_EXTRA = [
    "energyBoosts",
    "goingOut",
    "hobby",
    "preferredActivities",
    "weekend",
    "workValues",
  ];

  if (!DRY) await pg.query("BEGIN");
  try {
    if (!DRY) {
      const tables = await pg.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'arc' ORDER BY tablename`
      );
      if (!tables.rowCount) throw new Error("schema arc has no tables to truncate");
      const list = tables.rows
        .map((row) => `arc.${JSON.stringify(row.tablename)}`)
        .join(", ");
      await pg.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
      report.truncatedTarget = true;
      placeholderCreatorId = null;
      knownUsers.clear();
      knownManhuas.clear();
      knownChapters.clear();
    }
    const skipChildDelete = Boolean(report.truncatedTarget);
    const userBatch = makeBatch(
      `INSERT INTO arc.users (
        id, username, email, phone, password_hash, session_token, token_version,
        has_used_trial, trial_granted_at, device_id, last_register_ip, last_device_id,
        device_switch_window_start, device_switch_count, device_switch_first_at,
        lock_until, lock_reason, role, is_active, blocked, is_vip, vip_expires_at, vip_level,
        avatar, reset_password_token_hash, reset_password_expires_at, reset_password_requested_at,
        extra, created_at, updated_at, mongo_v
      )`,
      `ON CONFLICT (id) DO UPDATE SET
        username=EXCLUDED.username, email=EXCLUDED.email, phone=EXCLUDED.phone,
        password_hash=EXCLUDED.password_hash, session_token=EXCLUDED.session_token,
        token_version=EXCLUDED.token_version, extra=EXCLUDED.extra, updated_at=EXCLUDED.updated_at`
    );
    const pageBatch = makeBatch(
      `INSERT INTO arc.chapter_pages (chapter_id, page_number, image_url, original_name, width, height, extra)`,
      `ON CONFLICT (chapter_id, page_number) DO UPDATE SET image_url=EXCLUDED.image_url`
    );
    const chapterDailyBatch = makeBatch(
      `INSERT INTO arc.chapter_daily_views (chapter_id, day_key, views)`,
      `ON CONFLICT (chapter_id, day_key) DO UPDATE SET views=EXCLUDED.views`
    );
    const chapterMonthlyBatch = makeBatch(
      `INSERT INTO arc.chapter_monthly_views (chapter_id, month_key, views)`,
      `ON CONFLICT (chapter_id, month_key) DO UPDATE SET views=EXCLUDED.views`
    );
    const manhuaGenreBatch = makeBatch(`INSERT INTO arc.manhua_genres (manhua_id, genre, position)`);
    const manhuaOwnerBatch = makeBatch(
      `INSERT INTO arc.manhua_owners (manhua_id, user_id)`,
      `ON CONFLICT DO NOTHING`
    );
    const manhuaDailyBatch = makeBatch(
      `INSERT INTO arc.manhua_daily_views (manhua_id, day_key, views)`,
      `ON CONFLICT (manhua_id, day_key) DO UPDATE SET views=EXCLUDED.views`
    );
    const auditBatch = makeBatch(
      `INSERT INTO arc.audit_logs (
        id, ts, level, category, action, message, user_id, username_snapshot, role_snapshot,
        ip, device_id_hash, method, path, status_code, duration_ms, request_id, meta, extra, mongo_v
      )`,
      `ON CONFLICT (id) DO NOTHING`
    );
    const readMonthBatch = makeBatch(
      `INSERT INTO arc.chapter_read_months (id, chapter_id, viewer_key, month_key, first_read_at, expire_at, extra, created_at, updated_at, mongo_v)`,
      `ON CONFLICT (id) DO UPDATE SET expire_at=EXCLUDED.expire_at`
    );
    await each("users", async (doc) => {
      const known = EXPECTED.users.fields;
      const extra = extraOf(doc, known);
      for (const k of USER_PROFILE_EXTRA) {
        if (doc[k] !== undefined) extra[k] = doc[k];
      }
      const id = oid(doc._id);
      if (!doc.password) {
        await quarantine("users", id, "missing password hash", { hasUsername: Boolean(doc.username) });
        return;
      }
      knownUsers.add(id);
      await userBatch.push([
        id,
        doc.username,
        String(doc.email || "").toLowerCase(),
        doc.phone || "",
        doc.password,
        doc.sessionToken || null,
        num(doc.tokenVersion, 0),
        Boolean(doc.hasUsedTrial),
        ts(doc.trialGrantedAt),
        doc.deviceId || "",
        doc.lastRegisterIP || "",
        doc.lastDeviceId || "",
        ts(doc.deviceSwitchWindowStart),
        num(doc.deviceSwitchCount, 0),
        ts(doc.deviceSwitchFirstAt),
        ts(doc.lockUntil),
        doc.lockReason || "",
        doc.role || "user",
        doc.isActive !== false,
        Boolean(doc.blocked),
        Boolean(doc.isVIP),
        ts(doc.vipExpiresAt),
        num(doc.vipLevel, 0),
        doc.avatar || null,
        doc.resetPasswordTokenHash || null,
        ts(doc.resetPasswordExpiresAt),
        ts(doc.resetPasswordRequestedAt),
        extra,
        ts(doc.createdAt) || new Date(0),
        ts(doc.updatedAt) || new Date(0),
        doc.__v ?? null,
      ]);
    });
    await userBatch.flush();

    await each("trialdevices", async (doc) => {
      const firstUser = oid(doc.firstUserId);
      const firstOk = firstUser && (await userExists(firstUser));
      if (firstUser && !firstOk) {
        await quarantine("trialdevices", oid(doc._id), "invalid firstUserId", {});
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.trial_devices (id, device_id, first_user_id, first_granted_at, ip, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET device_id=EXCLUDED.device_id, first_user_id=EXCLUDED.first_user_id`,
        [
          oid(doc._id),
          doc.deviceId,
          firstUser && firstOk ? firstUser : null,
          ts(doc.firstGrantedAt),
          doc.ip || "",
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("appsettings", async (doc) => {
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.app_settings (id, key, value, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3::jsonb,'{}'::jsonb,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET key=EXCLUDED.key, value=EXCLUDED.value`,
        [
          oid(doc._id),
          doc.key,
          JSON.stringify(doc.value ?? null),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("vipplans", async (doc) => {
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.vip_plans (id, months, price_total, active, display_order, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET months=EXCLUDED.months, price_total=EXCLUDED.price_total`,
        [
          oid(doc._id),
          doc.months,
          doc.priceTotal,
          doc.active !== false,
          num(doc.displayOrder, 0),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("teams", async (doc) => {
      const createdBy = oid(doc.createdBy);
      if (!(await userExists(createdBy))) {
        await quarantine("teams", oid(doc._id), "invalid createdBy", {});
        return;
      }
      if (!DRY) {
        await pg.query(
          `INSERT INTO arc.teams (id, name, description, created_by, extra, created_at, updated_at, mongo_v)
           VALUES ($1,$2,$3,$4,'{}'::jsonb,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description`,
          [
            oid(doc._id),
            doc.name,
            doc.description || "",
            createdBy,
            ts(doc.createdAt) || new Date(0),
            ts(doc.updatedAt) || new Date(0),
            doc.__v ?? null,
          ]
        );
        await pg.query("DELETE FROM arc.team_members WHERE team_id=$1", [oid(doc._id)]);
        for (const member of doc.members || []) {
          const uid = oid(member.user);
          if (!(await userExists(uid))) {
            await quarantine("teams.members", oid(doc._id), "invalid member.user", {});
            continue;
          }
          await pg.query(
            `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (team_id, user_id) DO UPDATE SET role=EXCLUDED.role`,
            [
              oid(doc._id),
              uid,
              member.role || "editor",
              member.addedBy && (await userExists(oid(member.addedBy))) ? oid(member.addedBy) : null,
              ts(member.addedAt),
            ]
          );
        }
      }
    });

    await each("teaminvites", async (doc) => {
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.team_invites (id, team_id, invited_user_id, invited_by_id, role, status, responded_at, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'{}'::jsonb,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, responded_at=EXCLUDED.responded_at`,
        [
          oid(doc._id),
          oid(doc.team),
          oid(doc.invitedUser),
          oid(doc.invitedBy),
          doc.role || "editor",
          doc.status || "pending",
          ts(doc.respondedAt),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("manhuas", async (doc) => {
      const createdBy = oid(doc.createdBy);
      if (!(await userExists(createdBy))) {
        await quarantine("manhuas", oid(doc._id), "invalid createdBy", {});
        return;
      }
      if (DRY) return;
      const teamId = oid(doc.team);
      await pg.query(
        `INSERT INTO arc.manhuas (
          id, title, title_en, slug, rating, description, cover_image, cover_image_url,
          rating_average, rating_count, status, created_by, team_id, views, weekly_views,
          deleted_at, deleted_by, extra, created_at, updated_at, mongo_v
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'{}'::jsonb,$18,$19,$20
        ) ON CONFLICT (id) DO UPDATE SET
          title=EXCLUDED.title, slug=EXCLUDED.slug, views=EXCLUDED.views, weekly_views=EXCLUDED.weekly_views,
          deleted_at=EXCLUDED.deleted_at, updated_at=EXCLUDED.updated_at`,
        [
          oid(doc._id),
          doc.title,
          doc.titleEn || null,
          doc.slug,
          num(doc.rating, 0),
          doc.description || null,
          doc.coverImage || null,
          doc.coverImageUrl || null,
          num(doc.ratingAverage, 0),
          num(doc.ratingCount, 0),
          doc.status || "ongoing",
          createdBy,
          teamId,
          num(doc.views, 0),
          num(doc.weeklyViews, 0),
          ts(doc.deletedAt),
          doc.deletedBy && (await userExists(oid(doc.deletedBy))) ? oid(doc.deletedBy) : null,
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
      knownManhuas.add(oid(doc._id));
      if (!skipChildDelete) {
        await pg.query("DELETE FROM arc.manhua_genres WHERE manhua_id=$1", [oid(doc._id)]);
        await pg.query("DELETE FROM arc.manhua_owners WHERE manhua_id=$1", [oid(doc._id)]);
        await pg.query("DELETE FROM arc.manhua_daily_views WHERE manhua_id=$1", [oid(doc._id)]);
      }
      let pos = 0;
      for (const genre of doc.genres || []) {
        await manhuaGenreBatch.push([oid(doc._id), String(genre), pos++]);
      }
      for (const owner of doc.owners || []) {
        const uid = oid(owner);
        if (!(await userExists(uid))) {
          await quarantine("manhuas.owners", oid(doc._id), "invalid owner", {});
          continue;
        }
        await manhuaOwnerBatch.push([oid(doc._id), uid]);
      }
      for (const [dayKey, views] of mapEntries(doc.dailyViews)) {
        await manhuaDailyBatch.push([oid(doc._id), String(dayKey), num(views, 0)]);
      }
    });
    await manhuaGenreBatch.flush();
    await manhuaOwnerBatch.flush();
    await manhuaDailyBatch.flush();

    await each("chapters", async (doc) => {
      const manhuaId = oid(doc.manhua);
      if (!(await ensurePlaceholderManhua(manhuaId, "chapters"))) {
        await quarantine("chapters", oid(doc._id), "invalid manhua", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.chapters (
          id, manhua_id, chapter_number, title, language, status, views, uploaded_by,
          deleted_at, deleted_by, extra, created_at, updated_at, mongo_v
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'{}'::jsonb,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
          chapter_number=EXCLUDED.chapter_number, status=EXCLUDED.status, views=EXCLUDED.views,
          deleted_at=EXCLUDED.deleted_at, updated_at=EXCLUDED.updated_at`,
        [
          oid(doc._id),
          manhuaId,
          doc.chapterNumber,
          doc.title || null,
          doc.language || "mn",
          doc.status || "draft",
          num(doc.views, 0),
          doc.uploadedBy && (await userExists(oid(doc.uploadedBy))) ? oid(doc.uploadedBy) : null,
          ts(doc.deletedAt),
          doc.deletedBy && (await userExists(oid(doc.deletedBy))) ? oid(doc.deletedBy) : null,
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
      knownChapters.add(oid(doc._id));
      if (!skipChildDelete) {
        await pg.query("DELETE FROM arc.chapter_pages WHERE chapter_id=$1", [oid(doc._id)]);
        await pg.query("DELETE FROM arc.chapter_daily_views WHERE chapter_id=$1", [oid(doc._id)]);
        await pg.query("DELETE FROM arc.chapter_monthly_views WHERE chapter_id=$1", [oid(doc._id)]);
      }
      const pages = Array.isArray(doc.pages) ? doc.pages : [];
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i] || {};
        const imageUrl = page.imageUrl || page.sourceUrl;
        if (!imageUrl) {
          await quarantine("chapters.pages", oid(doc._id), `page ${i} missing imageUrl`, {
            pageNumber: page.pageNumber ?? i + 1,
          });
          continue;
        }
        const extra = extraOf(page, ["pageNumber", "imageUrl", "originalName", "width", "height", "sourceUrl"]);
        if (page.sourceUrl && page.sourceUrl !== page.imageUrl) extra.sourceUrl = page.sourceUrl;
        await pageBatch.push([
          oid(doc._id),
          Number.isFinite(Number(page.pageNumber)) ? Number(page.pageNumber) : i + 1,
          imageUrl,
          page.originalName || null,
          page.width ?? null,
          page.height ?? null,
          extra,
        ]);
      }
      for (const [dayKey, views] of mapEntries(doc.dailyViews)) {
        await chapterDailyBatch.push([oid(doc._id), String(dayKey), num(views, 0)]);
      }
      for (const [monthKey, views] of mapEntries(doc.monthlyViews)) {
        await chapterMonthlyBatch.push([oid(doc._id), String(monthKey), num(views, 0)]);
      }
    });
    await pageBatch.flush();
    await chapterDailyBatch.flush();
    await chapterMonthlyBatch.flush();

    await each("users", async (doc) => {
      if (DRY) return;
      const uid = oid(doc._id);
      for (const bm of doc.bookmarks || []) {
        const mid = oid(bm.manhua);
        if (!(await ensurePlaceholderManhua(mid, "users.bookmarks"))) {
          await quarantine("users.bookmarks", uid, "invalid manhua", {});
          continue;
        }
        await pg.query(
          `INSERT INTO arc.user_list_bookmarks (user_id, manhua_id, added_at, mongo_sub_id)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, manhua_id) DO UPDATE SET added_at=EXCLUDED.added_at`,
          [uid, mid, ts(bm.addedAt), bm._id ? String(bm._id) : null]
        );
      }
      for (const rv of doc.recentlyViewed || []) {
        const mid = oid(rv.manhua);
        if (!(await ensurePlaceholderManhua(mid, "users.recentlyViewed"))) {
          await quarantine("users.recentlyViewed", uid, "invalid manhua", {});
          continue;
        }
        const cid = oid(rv.lastChapter);
        await pg.query(
          `INSERT INTO arc.user_recently_viewed (user_id, manhua_id, last_chapter_id, last_read_at, mongo_sub_id)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (user_id, manhua_id) DO UPDATE SET last_chapter_id=EXCLUDED.last_chapter_id`,
          [uid, mid, cid && (await chapterExists(cid)) ? cid : null, ts(rv.lastReadAt), rv._id ? String(rv._id) : null]
        );
      }
    });

    await each("bookmarks", async (doc) => {
      if (!(await userExists(oid(doc.user))) || !(await ensurePlaceholderManhua(oid(doc.manhua), "bookmarks"))) {
        await quarantine("bookmarks", oid(doc._id), "invalid user/manhua", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.reading_bookmarks (id, user_id, manhua_id, chapter_number, page_number, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET chapter_number=EXCLUDED.chapter_number, page_number=EXCLUDED.page_number`,
        [
          oid(doc._id),
          oid(doc.user),
          oid(doc.manhua),
          doc.chapterNumber,
          doc.pageNumber,
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("favorites", async (doc) => {
      if (!(await userExists(oid(doc.user))) || !(await ensurePlaceholderManhua(oid(doc.manhua), "favorites"))) {
        await quarantine("favorites", oid(doc._id), "invalid user/manhua", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.favorites (id, user_id, manhua_id, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,'{}'::jsonb,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id, manhua_id=EXCLUDED.manhua_id`,
        [
          oid(doc._id),
          oid(doc.user),
          oid(doc.manhua),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("comments", async (doc) => {
      const chapterId = oid(doc.chapter);
      const manhuaId = oid(doc.manhua);
      if (!oid(doc.user) || !(await userExists(oid(doc.user)))) {
        await quarantine("comments", oid(doc._id), "invalid user", {});
        return;
      }
      if (chapterId && !(await ensurePlaceholderChapter(chapterId, "comments"))) {
        await quarantine("comments", oid(doc._id), "invalid chapter", {});
        return;
      }
      if (manhuaId && !(await ensurePlaceholderManhua(manhuaId, "comments"))) {
        await quarantine("comments", oid(doc._id), "invalid manhua", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.comments (id, user_id, username_snapshot, chapter_id, manhua_id, body, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET body=EXCLUDED.body`,
        [
          oid(doc._id),
          oid(doc.user),
          doc.username,
          chapterId,
          manhuaId,
          doc.text,
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("requests", async (doc) => {
      if (DRY) return;
      const createdBy = oid(doc.createdBy);
      await pg.query(
        `INSERT INTO arc.requests (id, title, image_url, created_by, votes, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, votes=EXCLUDED.votes`,
        [
          oid(doc._id),
          doc.title,
          doc.imageUrl || "",
          createdBy && (await userExists(createdBy)) ? createdBy : null,
          num(doc.votes, 0),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
      await pg.query("DELETE FROM arc.request_monthly_votes WHERE request_id=$1", [oid(doc._id)]);
      await pg.query("DELETE FROM arc.request_voters WHERE request_id=$1", [oid(doc._id)]);
      for (const [monthKey, votes] of mapEntries(doc.monthlyVotes)) {
        await pg.query(
          `INSERT INTO arc.request_monthly_votes (request_id, month_key, votes) VALUES ($1,$2,$3)`,
          [oid(doc._id), String(monthKey), num(votes, 0)]
        );
      }
      for (const [monthKey, voters] of mapEntries(doc.votersByMonth)) {
        for (const voter of voters || []) {
          await pg.query(
            `INSERT INTO arc.request_voters (request_id, month_key, voter_key) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [oid(doc._id), String(monthKey), String(voter)]
          );
        }
      }
    });

    await each("feedbacks", async (doc) => {
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.feedback (id, type, name, description, image_url, status, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, description=EXCLUDED.description`,
        [
          oid(doc._id),
          doc.type,
          doc.name,
          doc.description,
          doc.imageUrl || "",
          doc.status || "new",
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("financemonths", async (doc) => {
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.finance_months (id, month_key, total_revenue, currency, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,'{}'::jsonb,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET total_revenue=EXCLUDED.total_revenue`,
        [
          oid(doc._id),
          doc.monthKey,
          doc.totalRevenue ?? 0,
          doc.currency || "MNT",
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
      await pg.query("DELETE FROM arc.finance_revenue_events WHERE finance_month_id=$1", [oid(doc._id)]);
      (doc.revenueEvents || []).forEach(() => {});
      let pos = 0;
      for (const ev of doc.revenueEvents || []) {
        await pg.query(
          `INSERT INTO arc.finance_revenue_events (finance_month_id, position, user_id, admin_id, amount, currency, paid_at, months_granted, note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            oid(doc._id),
            pos++,
            ev.userId && (await userExists(oid(ev.userId))) ? oid(ev.userId) : null,
            ev.adminId && (await userExists(oid(ev.adminId))) ? oid(ev.adminId) : null,
            ev.amount,
            ev.currency || "MNT",
            ts(ev.paidAt) || new Date(0),
            num(ev.monthsGranted, 0),
            ev.note || "",
          ]
        );
      }
    });

    await each("editormonthstats", async (doc) => {
      if (!(await userExists(oid(doc.editorId)))) {
        await quarantine("editormonthstats", oid(doc._id), "invalid editorId", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.editor_month_stats (id, month_key, editor_id, chapter_monthly_views, chapters_uploaded, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET chapter_monthly_views=EXCLUDED.chapter_monthly_views, chapters_uploaded=EXCLUDED.chapters_uploaded`,
        [
          oid(doc._id),
          doc.monthKey,
          oid(doc.editorId),
          num(doc.chapterMonthlyViews, 0),
          num(doc.chaptersUploaded, 0),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("editormanhuamonthstats", async (doc) => {
      if (!(await userExists(oid(doc.editorId))) || !(await ensurePlaceholderManhua(oid(doc.manhuaId), "editormanhuamonthstats"))) {
        await quarantine("editormanhuamonthstats", oid(doc._id), "invalid editor/manhua", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.editor_manhua_month_stats (id, month_key, editor_id, manhua_id, monthly_views, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET monthly_views=EXCLUDED.monthly_views`,
        [
          oid(doc._id),
          doc.monthKey,
          oid(doc.editorId),
          oid(doc.manhuaId),
          num(doc.monthlyViews, 0),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("chapterreads", async (doc) => {
      if (!(await ensurePlaceholderChapter(oid(doc.chapterId), "chapterreads"))) {
        await quarantine("chapterreads", oid(doc._id), "invalid chapterId", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.chapter_reads (id, chapter_id, viewer_key, first_read_at, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,'{}'::jsonb,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET viewer_key=EXCLUDED.viewer_key`,
        [
          oid(doc._id),
          oid(doc.chapterId),
          doc.viewerKey,
          ts(doc.firstReadAt),
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    await each("chapterreadmonths", async (doc) => {
      if (!(await ensurePlaceholderChapter(oid(doc.chapterId), "chapterreadmonths"))) {
        await quarantine("chapterreadmonths", oid(doc._id), "invalid chapterId", {});
        return;
      }
      if (DRY) return;
      await readMonthBatch.push([
        oid(doc._id),
        oid(doc.chapterId),
        doc.viewerKey,
        doc.monthKey,
        ts(doc.firstReadAt),
        ts(doc.expireAt) || new Date(),
        {},
        ts(doc.createdAt) || new Date(0),
        ts(doc.updatedAt) || new Date(0),
        doc.__v ?? null,
      ]);
    });
    await readMonthBatch.flush();

    await each("auditlogs", async (doc) => {
      if (DRY) return;
      const extra = extraOf(doc, EXPECTED.auditlogs.fields.concat(["__v"]));
      await auditBatch.push([
        oid(doc._id),
        ts(doc.ts) || new Date(0),
        doc.level,
        doc.category,
        doc.action,
        doc.message,
        doc.user?.id ? oid(doc.user.id) : null,
        doc.user?.username || null,
        doc.user?.role || null,
        doc.ip || null,
        doc.deviceIdHash || null,
        doc.method || null,
        doc.path || null,
        doc.statusCode ?? null,
        doc.durationMs ?? null,
        doc.requestId || null,
        doc.meta || {},
        extra,
        doc.__v ?? null,
      ]);
    });
    await auditBatch.flush();

    await each("actionlogs", async (doc) => {
      if (!(await userExists(oid(doc.user)))) {
        await quarantine("actionlogs", oid(doc._id), "invalid user", {});
        return;
      }
      if (DRY) return;
      await pg.query(
        `INSERT INTO arc.action_logs (id, user_id, action, target_type, target_id, description, extra, created_at, updated_at, mongo_v)
         VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          oid(doc._id),
          oid(doc.user),
          doc.action,
          doc.targetType,
          doc.targetId || null,
          doc.description || null,
          ts(doc.createdAt) || new Date(0),
          ts(doc.updatedAt) || new Date(0),
          doc.__v ?? null,
        ]
      );
    });

    if (!DRY) {
      const hidden = await pg.query(
        `UPDATE arc.chapters c
         SET deleted_at = coalesce(c.deleted_at, now()),
             extra = c.extra || jsonb_build_object('hiddenBecauseParentDeleted', true),
             updated_at = now()
         FROM arc.manhuas m
         WHERE c.manhua_id = m.id
           AND m.deleted_at IS NOT NULL
           AND c.deleted_at IS NULL
         RETURNING c.id`
      );
      report.hiddenChaptersBecauseParentDeleted = hidden.rowCount;
    }

    if (!DRY) await pg.query("COMMIT");
  } catch (err) {
    if (!DRY) await pg.query("ROLLBACK");
    throw err;
  }

  report.finishedAt = new Date().toISOString();
  report.ok = report.quarantine === 0;
  const out = path.join(__dirname, "last-migrate-report.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    `quarantine=${report.quarantine} ok=${report.ok} dryRun=${DRY} orphanMode=${ORPHAN_MODE} truncatedTarget=${report.truncatedTarget} insertMode=${report.insertMode} elapsedMs=${Date.parse(report.finishedAt) - Date.parse(report.startedAt)}`
  );
  if (report.phaseMs && Object.keys(report.phaseMs).length) {
    console.log(JSON.stringify({ phaseMs: report.phaseMs }));
  }
  if (!report.ok) process.exitCode = 2;
  await mongo.close();
  await pg.end();
}

main().catch((err) => {
  console.error("migrate failed:", err.message);
  process.exit(1);
});
