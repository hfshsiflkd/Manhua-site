#!/usr/bin/env node
"use strict";

/**
 * Postgres → Mongo reconciliation for post-cutover rollback.
 * Isolated Mongo only. Never writes production :27017.
 * Skips PG quarantine placeholders so they are not invented as source documents.
 *
 *   REVERSE_MONGO_URI=mongodb://127.0.0.1:27018/arc_reverse_rehearsal?directConnection=true \
 *   DATABASE_URL=... \
 *   node backend/scripts/mongo-pg/reverse.js
 */
const { MongoClient, ObjectId } = require("mongodb");
const { Client } = require("pg");
const {
  loadExplicitEnv,
  envFileFromArgv,
  parseEnvFile,
  assertIsolatedMongo,
  assertPostgresTarget,
  isUsablePostgresUrl,
  describePgTarget,
  pgClientConfig,
  resolvePostgresUrlFromValues,
} = require("./loadExplicitEnv");

const DRY = process.argv.includes("--dry-run");
const PLACEHOLDER = "quarantinePlaceholder";

const envFile = envFileFromArgv();
if (envFile) {
  const parsed = parseEnvFile(envFile);
  loadExplicitEnv(envFile, { override: true });
  const fromFile = resolvePostgresUrlFromValues(parsed.values);
  if (fromFile) process.env.DATABASE_URL = fromFile;
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function mongoDbName(uri) {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:"));
    return decodeURIComponent((u.pathname || "").replace(/^\//, "").split("?")[0] || "");
  } catch {
    return "";
  }
}

function assertReverseMongo(uri) {
  assertIsolatedMongo(uri);
  const name = mongoDbName(uri);
  if (!name) die("REVERSE_MONGO_URI must include a database name");
  if (["test", "admin", "local", "config"].includes(name)) {
    die(`refusing to reverse into Mongo database '${name}' (source/system)`);
  }
}

function asObjectId(value) {
  if (value == null || value === "") return undefined;
  const s = String(value);
  if (/^[0-9a-fA-F]{24}$/.test(s)) return new ObjectId(s);
  return s;
}

function asDate(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function extraOf(row) {
  const extra = row.extra && typeof row.extra === "object" ? { ...row.extra } : {};
  delete extra[PLACEHOLDER];
  delete extra.hiddenBecauseParentDeleted;
  delete extra.pgitest;
  return extra;
}

function isPlaceholderRow(row) {
  const extra = row.extra || {};
  return extra[PLACEHOLDER] === true || extra[PLACEHOLDER] === "true";
}

async function main() {
  const mongoUri = process.env.REVERSE_MONGO_URI || "";
  const pgUri = process.env.DATABASE_URL || "";
  if (!mongoUri) die("REVERSE_MONGO_URI missing");
  try {
    assertReverseMongo(mongoUri);
    console.log(JSON.stringify({ reverseTarget: describePgTarget(pgUri), mongoDb: mongoDbName(mongoUri) }));
    assertPostgresTarget(pgUri);
  } catch (err) {
    die(err.message);
  }

  const mongo = new MongoClient(mongoUri);
  const pg = new Client(pgClientConfig(pgUri));
  await mongo.connect();
  await pg.connect();
  const db = mongo.db();
  const report = { dryRun: DRY, skippedPlaceholders: {}, upserted: {}, deleted: {} };

  async function load(sql, params = []) {
    return (await pg.query(sql, params)).rows.filter((row) => !isPlaceholderRow(row));
  }

  async function reconcile(collName, docs, { skipDelete = false } = {}) {
    const coll = db.collection(collName);
    const ids = docs.map((d) => d._id).filter(Boolean);
    report.upserted[collName] = docs.length;
    if (DRY) {
      if (!skipDelete) {
        report.deleted[collName] = "(dry-run)";
      }
      return;
    }
    if (docs.length) {
      const ops = docs.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      }));
      const BATCH = 200;
      for (let i = 0; i < ops.length; i += BATCH) {
        await coll.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
      }
    }
    if (!skipDelete) {
      const del = ids.length
        ? await coll.deleteMany({ _id: { $nin: ids } })
        : await coll.deleteMany({});
      report.deleted[collName] = del.deletedCount;
    }
  }

  const placeholderManhuas = (
    await pg.query(
      `SELECT count(*)::int AS n FROM arc.manhuas WHERE extra->>'quarantinePlaceholder' = 'true'`
    )
  ).rows[0].n;
  const placeholderChapters = (
    await pg.query(
      `SELECT count(*)::int AS n FROM arc.chapters WHERE extra->>'quarantinePlaceholder' = 'true'`
    )
  ).rows[0].n;
  report.skippedPlaceholders = { manhuas: placeholderManhuas, chapters: placeholderChapters };

  const users = await load("SELECT * FROM arc.users");
  const userBookmarks = await pg.query(`SELECT * FROM arc.user_list_bookmarks`);
  const userRecent = await pg.query(`SELECT * FROM arc.user_recently_viewed`);
  const bmByUser = new Map();
  for (const row of userBookmarks.rows) {
    const list = bmByUser.get(row.user_id) || [];
    list.push({
      manhua: asObjectId(row.manhua_id),
      addedAt: asDate(row.added_at) || new Date(0),
      ...(row.mongo_sub_id && /^[0-9a-fA-F]{24}$/.test(row.mongo_sub_id)
        ? { _id: new ObjectId(row.mongo_sub_id) }
        : {}),
    });
    bmByUser.set(row.user_id, list);
  }
  const rvByUser = new Map();
  for (const row of userRecent.rows) {
    const list = rvByUser.get(row.user_id) || [];
    list.push({
      manhua: asObjectId(row.manhua_id),
      lastChapter: asObjectId(row.last_chapter_id),
      lastReadAt: asDate(row.last_read_at) || new Date(0),
      ...(row.mongo_sub_id && /^[0-9a-fA-F]{24}$/.test(row.mongo_sub_id)
        ? { _id: new ObjectId(row.mongo_sub_id) }
        : {}),
    });
    rvByUser.set(row.user_id, list);
  }

  await reconcile(
    "users",
    users.map((row) => {
      const extra = extraOf(row);
      const doc = {
        _id: asObjectId(row.id),
        username: row.username,
        email: row.email,
        phone: row.phone || "",
        password: row.password_hash,
        sessionToken: row.session_token || null,
        tokenVersion: Number(row.token_version || 0),
        hasUsedTrial: Boolean(row.has_used_trial),
        trialGrantedAt: asDate(row.trial_granted_at) || null,
        deviceId: row.device_id || "",
        lastRegisterIP: row.last_register_ip || "",
        lastDeviceId: row.last_device_id || "",
        deviceSwitchWindowStart: asDate(row.device_switch_window_start) || null,
        deviceSwitchCount: Number(row.device_switch_count || 0),
        deviceSwitchFirstAt: asDate(row.device_switch_first_at) || null,
        lockUntil: asDate(row.lock_until) || null,
        lockReason: row.lock_reason || "",
        role: row.role || "user",
        isActive: row.is_active !== false,
        blocked: Boolean(row.blocked),
        isVIP: Boolean(row.is_vip),
        vipExpiresAt: asDate(row.vip_expires_at) || null,
        vipLevel: Number(row.vip_level || 0),
        avatar: row.avatar || null,
        resetPasswordTokenHash: row.reset_password_token_hash,
        resetPasswordExpiresAt: asDate(row.reset_password_expires_at),
        resetPasswordRequestedAt: asDate(row.reset_password_requested_at),
        bookmarks: bmByUser.get(row.id) || [],
        recentlyViewed: rvByUser.get(row.id) || [],
        createdAt: asDate(row.created_at) || new Date(0),
        updatedAt: asDate(row.updated_at) || new Date(0),
        __v: row.mongo_v ?? 0,
      };
      Object.assign(doc, extra);
      return doc;
    })
  );

  const trials = await load("SELECT * FROM arc.trial_devices");
  await reconcile(
    "trialdevices",
    trials.map((row) => ({
      _id: asObjectId(row.id),
      deviceId: row.device_id,
      firstUserId: asObjectId(row.first_user_id),
      firstGrantedAt: asDate(row.first_granted_at),
      ip: row.ip || "",
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const settings = await load("SELECT * FROM arc.app_settings");
  await reconcile(
    "appsettings",
    settings.map((row) => ({
      _id: asObjectId(row.id),
      key: row.key,
      value: row.value,
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const plans = await load("SELECT * FROM arc.vip_plans");
  await reconcile(
    "vipplans",
    plans.map((row) => ({
      _id: asObjectId(row.id),
      months: Number(row.months),
      priceTotal: Number(row.price_total),
      active: Boolean(row.active),
      displayOrder: Number(row.display_order || 0),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const members = await pg.query("SELECT * FROM arc.team_members");
  const membersByTeam = new Map();
  for (const row of members.rows) {
    const list = membersByTeam.get(row.team_id) || [];
    list.push({
      user: asObjectId(row.user_id),
      role: row.role || "editor",
      addedBy: asObjectId(row.added_by),
      addedAt: asDate(row.added_at),
    });
    membersByTeam.set(row.team_id, list);
  }
  const teams = await load("SELECT * FROM arc.teams");
  await reconcile(
    "teams",
    teams.map((row) => ({
      _id: asObjectId(row.id),
      name: row.name,
      description: row.description || "",
      createdBy: asObjectId(row.created_by),
      members: membersByTeam.get(row.id) || [],
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const invites = await load("SELECT * FROM arc.team_invites");
  await reconcile(
    "teaminvites",
    invites.map((row) => ({
      _id: asObjectId(row.id),
      team: asObjectId(row.team_id),
      invitedUser: asObjectId(row.invited_user_id),
      invitedBy: asObjectId(row.invited_by_id),
      role: row.role,
      status: row.status,
      respondedAt: asDate(row.responded_at),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const genres = await pg.query("SELECT * FROM arc.manhua_genres ORDER BY manhua_id, position");
  const owners = await pg.query("SELECT * FROM arc.manhua_owners");
  const manhuaDays = await pg.query("SELECT * FROM arc.manhua_daily_views");
  const genresBy = new Map();
  for (const row of genres.rows) {
    const list = genresBy.get(row.manhua_id) || [];
    list.push(row.genre);
    genresBy.set(row.manhua_id, list);
  }
  const ownersBy = new Map();
  for (const row of owners.rows) {
    const list = ownersBy.get(row.manhua_id) || [];
    list.push(asObjectId(row.user_id));
    ownersBy.set(row.manhua_id, list);
  }
  const daysBy = new Map();
  for (const row of manhuaDays.rows) {
    const map = daysBy.get(row.manhua_id) || {};
    map[row.day_key] = Number(row.views || 0);
    daysBy.set(row.manhua_id, map);
  }
  const manhuas = await load("SELECT * FROM arc.manhuas");
  await reconcile(
    "manhuas",
    manhuas.map((row) => {
      const extra = extraOf(row);
      const doc = {
        _id: asObjectId(row.id),
        title: row.title,
        titleEn: row.title_en || undefined,
        slug: row.slug,
        rating: Number(row.rating || 0),
        description: row.description || undefined,
        coverImage: row.cover_image || undefined,
        coverImageUrl: row.cover_image_url || undefined,
        ratingAverage: Number(row.rating_average || 0),
        ratingCount: Number(row.rating_count || 0),
        status: row.status,
        genres: genresBy.get(row.id) || [],
        createdBy: asObjectId(row.created_by),
        owners: ownersBy.get(row.id) || [],
        team: asObjectId(row.team_id),
        views: Number(row.views || 0),
        dailyViews: daysBy.get(row.id) || {},
        weeklyViews: Number(row.weekly_views || 0),
        deletedAt: asDate(row.deleted_at) || null,
        deletedBy: asObjectId(row.deleted_by),
        createdAt: asDate(row.created_at) || new Date(0),
        updatedAt: asDate(row.updated_at) || new Date(0),
        __v: row.mongo_v ?? 0,
      };
      Object.assign(doc, extra);
      return doc;
    })
  );

  const pages = await pg.query("SELECT * FROM arc.chapter_pages ORDER BY chapter_id, page_number");
  const chDays = await pg.query("SELECT * FROM arc.chapter_daily_views");
  const chMonths = await pg.query("SELECT * FROM arc.chapter_monthly_views");
  const pagesBy = new Map();
  for (const row of pages.rows) {
    const list = pagesBy.get(row.chapter_id) || [];
    list.push({
      pageNumber: Number(row.page_number),
      imageUrl: row.image_url,
      originalName: row.original_name || undefined,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
    });
    pagesBy.set(row.chapter_id, list);
  }
  const chDaysBy = new Map();
  for (const row of chDays.rows) {
    const map = chDaysBy.get(row.chapter_id) || {};
    map[row.day_key] = Number(row.views || 0);
    chDaysBy.set(row.chapter_id, map);
  }
  const chMonthsBy = new Map();
  for (const row of chMonths.rows) {
    const map = chMonthsBy.get(row.chapter_id) || {};
    map[row.month_key] = Number(row.views || 0);
    chMonthsBy.set(row.chapter_id, map);
  }
  const chapters = await load("SELECT * FROM arc.chapters");
  await reconcile(
    "chapters",
    chapters.map((row) => {
      const extra = extraOf(row);
      const doc = {
        _id: asObjectId(row.id),
        manhua: asObjectId(row.manhua_id),
        chapterNumber: Number(row.chapter_number),
        title: row.title || undefined,
        language: row.language || "mn",
        status: row.status,
        views: Number(row.views || 0),
        pages: pagesBy.get(row.id) || [],
        dailyViews: chDaysBy.get(row.id) || {},
        monthlyViews: chMonthsBy.get(row.id) || {},
        uploadedBy: asObjectId(row.uploaded_by),
        deletedAt: asDate(row.deleted_at) || null,
        deletedBy: asObjectId(row.deleted_by),
        createdAt: asDate(row.created_at) || new Date(0),
        updatedAt: asDate(row.updated_at) || new Date(0),
        __v: row.mongo_v ?? 0,
      };
      Object.assign(doc, extra);
      return doc;
    })
  );

  const favorites = await load(`SELECT * FROM arc.favorites`);
  await reconcile(
    "favorites",
    favorites.map((row) => ({
      _id: asObjectId(row.id),
      user: asObjectId(row.user_id),
      manhua: asObjectId(row.manhua_id),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const bookmarks = await load(`SELECT * FROM arc.reading_bookmarks`);
  await reconcile(
    "bookmarks",
    bookmarks.map((row) => ({
      _id: asObjectId(row.id),
      user: asObjectId(row.user_id),
      manhua: asObjectId(row.manhua_id),
      chapterNumber: Number(row.chapter_number),
      pageNumber: Number(row.page_number),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const comments = await load("SELECT * FROM arc.comments");
  await reconcile(
    "comments",
    comments.map((row) => ({
      _id: asObjectId(row.id),
      user: asObjectId(row.user_id),
      username: row.username_snapshot,
      chapter: asObjectId(row.chapter_id),
      manhua: asObjectId(row.manhua_id),
      text: row.body,
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const monthlyVotes = await pg.query("SELECT * FROM arc.request_monthly_votes");
  const voters = await pg.query("SELECT * FROM arc.request_voters");
  const mvBy = new Map();
  for (const row of monthlyVotes.rows) {
    const map = mvBy.get(row.request_id) || {};
    map[row.month_key] = Number(row.votes || 0);
    mvBy.set(row.request_id, map);
  }
  const votersBy = new Map();
  for (const row of voters.rows) {
    const map = votersBy.get(row.request_id) || {};
    const list = map[row.month_key] || [];
    list.push(row.voter_key);
    map[row.month_key] = list;
    votersBy.set(row.request_id, map);
  }
  const requests = await load("SELECT * FROM arc.requests");
  await reconcile(
    "requests",
    requests.map((row) => ({
      _id: asObjectId(row.id),
      title: row.title,
      imageUrl: row.image_url || "",
      createdBy: asObjectId(row.created_by),
      votes: Number(row.votes || 0),
      monthlyVotes: mvBy.get(row.id) || {},
      votersByMonth: votersBy.get(row.id) || {},
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const feedbacks = await load("SELECT * FROM arc.feedback");
  await reconcile(
    "feedbacks",
    feedbacks.map((row) => ({
      _id: asObjectId(row.id),
      type: row.type,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url || "",
      status: row.status,
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const events = await pg.query("SELECT * FROM arc.finance_revenue_events ORDER BY finance_month_id, position");
  const evBy = new Map();
  for (const row of events.rows) {
    const list = evBy.get(row.finance_month_id) || [];
    list.push({
      userId: asObjectId(row.user_id),
      adminId: asObjectId(row.admin_id),
      amount: Number(row.amount),
      currency: row.currency || "MNT",
      paidAt: asDate(row.paid_at) || new Date(0),
      monthsGranted: Number(row.months_granted || 0),
      note: row.note || "",
    });
    evBy.set(row.finance_month_id, list);
  }
  const finance = await load("SELECT * FROM arc.finance_months");
  await reconcile(
    "financemonths",
    finance.map((row) => ({
      _id: asObjectId(row.id),
      monthKey: row.month_key,
      totalRevenue: Number(row.total_revenue || 0),
      currency: row.currency || "MNT",
      revenueEvents: evBy.get(row.id) || [],
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const editorMonth = await load("SELECT * FROM arc.editor_month_stats");
  await reconcile(
    "editormonthstats",
    editorMonth.map((row) => ({
      _id: asObjectId(row.id),
      monthKey: row.month_key,
      editorId: asObjectId(row.editor_id),
      chapterMonthlyViews: Number(row.chapter_monthly_views || 0),
      chaptersUploaded: Number(row.chapters_uploaded || 0),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const editorManhua = await load(`SELECT * FROM arc.editor_manhua_month_stats`);
  await reconcile(
    "editormanhuamonthstats",
    editorManhua.map((row) => ({
      _id: asObjectId(row.id),
      monthKey: row.month_key,
      editorId: asObjectId(row.editor_id),
      manhuaId: asObjectId(row.manhua_id),
      monthlyViews: Number(row.monthly_views || 0),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const reads = await load(`SELECT * FROM arc.chapter_reads`);
  await reconcile(
    "chapterreads",
    reads.map((row) => ({
      _id: asObjectId(row.id),
      chapterId: asObjectId(row.chapter_id),
      viewerKey: row.viewer_key,
      firstReadAt: asDate(row.first_read_at),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const readMonths = await load(`SELECT * FROM arc.chapter_read_months`);
  await reconcile(
    "chapterreadmonths",
    readMonths.map((row) => ({
      _id: asObjectId(row.id),
      chapterId: asObjectId(row.chapter_id),
      viewerKey: row.viewer_key,
      monthKey: row.month_key,
      firstReadAt: asDate(row.first_read_at),
      expireAt: asDate(row.expire_at),
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const audits = await load("SELECT * FROM arc.audit_logs");
  await reconcile(
    "auditlogs",
    audits.map((row) => ({
      _id: asObjectId(row.id),
      ts: asDate(row.ts) || new Date(0),
      level: row.level,
      category: row.category,
      action: row.action,
      message: row.message,
      user: row.user_id
        ? { id: asObjectId(row.user_id), username: row.username_snapshot, role: row.role_snapshot }
        : undefined,
      ip: row.ip,
      deviceIdHash: row.device_id_hash,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
      durationMs: row.duration_ms,
      requestId: row.request_id,
      meta: row.meta || {},
    }))
  );

  const actions = await load("SELECT * FROM arc.action_logs");
  await reconcile(
    "actionlogs",
    actions.map((row) => ({
      _id: asObjectId(row.id),
      user: asObjectId(row.user_id),
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      description: row.description,
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  const attempts = await load("SELECT * FROM arc.register_attempts");
  await reconcile(
    "registerattempts",
    attempts.map((row) => ({
      _id: asObjectId(row.id),
      ip: row.ip,
      createdAt: asDate(row.created_at) || new Date(0),
      updatedAt: asDate(row.updated_at) || new Date(0),
      __v: row.mongo_v ?? 0,
    }))
  );

  console.log(JSON.stringify({ ok: true, ...report }, null, 2));
  await mongo.close();
  await pg.end();
}

main().catch((err) => {
  console.error("reverse failed:", err.message);
  process.exit(1);
});
