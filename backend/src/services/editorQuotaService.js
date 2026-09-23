"use strict";

const crypto = require("crypto");
const { isPostgres } = require("../store/driver");
const { query, withTransaction } = require("../db/postgres");
const { newId } = require("../store/pg/helpers");
const {
  MANHUA_LIMIT_PER_DAY,
  UPLOAD_BYTES_PER_DAY,
  quotaWindowMs,
} = require("../config/selfServeEditor");
const { PRESIGN_TTL_SEC } = require("../utils/imagePolicy");

class QuotaError extends Error {
  constructor(message, quota) {
    super(message);
    this.name = "QuotaError";
    this.code = "SELF_SERVE_QUOTA";
    this.statusCode = 429;
    this.quota = quota;
  }
}

function userIdOf(user) {
  return String(user?._id || user?.id || "");
}

async function isSelfServeEditor(userId) {
  if (!isPostgres() || !userId) return false;
  const r = await query(
    `SELECT self_serve FROM arc.editor_profiles WHERE user_id=$1`,
    [String(userId)]
  );
  return Boolean(r.rows[0]?.self_serve);
}

function formatBytesMn(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function quotaPayload({ kind, used, limit, remaining, resetsAt }) {
  return {
    kind,
    used,
    limit,
    remaining: Math.max(0, remaining),
    resetsAt: resetsAt ? new Date(resetsAt).toISOString() : null,
  };
}

function quotaMessage(quota) {
  const when = quota.resetsAt
    ? new Date(quota.resetsAt).toLocaleString("mn-MN", { hour12: false })
    : "24 цагийн дараа";
  if (quota.kind === "manhua") {
    return `Шинэ манхва нэмэх хязгаар дүүрсэн. ${quota.used}/${quota.limit} үүсгэсэн, үлдсэн ${quota.remaining}. Дахин боломжтой: ${when}.`;
  }
  return `Upload хэмжээний хязгаар дүүрсэн. Ашигласан ${formatBytesMn(quota.used)} / ${formatBytesMn(quota.limit)}, үлдсэн ${formatBytesMn(quota.remaining)}. Дахин боломжтой: ${when}.`;
}

async function windowUsage(client, userId, kind) {
  const since = new Date(Date.now() - quotaWindowMs());
  const r = await client.query(
    `SELECT
       count(*) FILTER (WHERE kind = $2)::int AS n,
       coalesce(sum(bytes) FILTER (WHERE kind = $2), 0)::bigint AS bytes,
       min(created_at) FILTER (WHERE kind = $2) AS oldest
     FROM arc.editor_quota_ledger
     WHERE user_id = $1
       AND kind = $2
       AND created_at >= $3
       AND (
         status = 'committed'
         OR (status = 'reserved' AND expires_at > now())
       )`,
    [userId, kind, since]
  );
  const row = r.rows[0] || {};
  const oldest = row.oldest ? new Date(row.oldest) : null;
  const resetsAt = oldest ? new Date(oldest.getTime() + quotaWindowMs()) : new Date(Date.now() + quotaWindowMs());
  return {
    count: Number(row.n || 0),
    bytes: Number(row.bytes || 0),
    resetsAt,
  };
}

async function upsertReservation(client, { userId, kind, bytes, idempotencyKey, expiresAt, extra }) {
  const existing = await client.query(
    `SELECT id, status, bytes, extra FROM arc.editor_quota_ledger
     WHERE user_id=$1 AND kind=$2 AND idempotency_key=$3`,
    [userId, kind, idempotencyKey]
  );
  if (existing.rowCount) {
    const row = existing.rows[0];
    if (row.status === "committed") {
      return { id: row.id, status: "committed", replayed: true, bytes: Number(row.bytes || 0), extra: row.extra || {} };
    }
    await client.query(
      `UPDATE arc.editor_quota_ledger
       SET status='reserved', bytes=$2, expires_at=$3, extra=$4::jsonb, updated_at=now()
       WHERE id=$1`,
      [row.id, bytes, expiresAt, JSON.stringify(extra || {})]
    );
    return { id: row.id, status: "reserved", replayed: true, bytes };
  }
  const id = newId();
  await client.query(
    `INSERT INTO arc.editor_quota_ledger (
      id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,'reserved',$6,$7::jsonb,now(),now())`,
    [id, userId, kind, bytes, idempotencyKey, expiresAt, JSON.stringify(extra || {})]
  );
  return { id, status: "reserved", replayed: false, bytes };
}

async function reserveManhua({ user, idempotencyKey }) {
  const userId = userIdOf(user);
  if (!(await isSelfServeEditor(userId))) return { skipped: true };
  if (!idempotencyKey) {
    const err = new Error("Idempotency key шаардлагатай.");
    err.statusCode = 400;
    throw err;
  }
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`editor-quota:${userId}`]);
    const reservation = await upsertReservation(client, {
      userId,
      kind: "manhua",
      bytes: 0,
      idempotencyKey: String(idempotencyKey).slice(0, 180),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      extra: { pgitest: Boolean(user.extra?.pgitest) },
    });
    if (reservation.status === "committed") return reservation;
    const usage = await windowUsage(client, userId, "manhua");
    if (usage.count > MANHUA_LIMIT_PER_DAY) {
      const quota = quotaPayload({
        kind: "manhua",
        used: usage.count - 1,
        limit: MANHUA_LIMIT_PER_DAY,
        remaining: 0,
        resetsAt: usage.resetsAt,
      });
      throw new QuotaError(quotaMessage(quota), quota);
    }
    return reservation;
  });
}

async function reserveUpload({ user, bytes, idempotencyKey }) {
  const userId = userIdOf(user);
  if (!(await isSelfServeEditor(userId))) return { skipped: true };
  const size = Number(bytes) || 0;
  if (size <= 0) {
    const err = new Error("Файлын хэмжээ буруу байна.");
    err.statusCode = 400;
    throw err;
  }
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`editor-quota:${userId}`]);
    const reservation = await upsertReservation(client, {
      userId,
      kind: "upload",
      bytes: size,
      idempotencyKey: String(idempotencyKey).slice(0, 180),
      expiresAt: new Date(Date.now() + PRESIGN_TTL_SEC * 1000),
    });
    if (reservation.status === "committed") return reservation;
    const usage = await windowUsage(client, userId, "upload");
    if (usage.bytes > UPLOAD_BYTES_PER_DAY) {
      const quota = quotaPayload({
        kind: "upload",
        used: Math.max(0, usage.bytes - size),
        limit: UPLOAD_BYTES_PER_DAY,
        remaining: 0,
        resetsAt: usage.resetsAt,
      });
      throw new QuotaError(quotaMessage(quota), quota);
    }
    return reservation;
  });
}

async function commitReservation({ user, kind, idempotencyKey, bytes, extra }) {
  if (!isPostgres()) return { skipped: true };
  const userId = userIdOf(user);
  if (!(await isSelfServeEditor(userId))) return { skipped: true };
  const r = await query(
    `UPDATE arc.editor_quota_ledger
     SET status='committed',
         bytes=COALESCE($4, bytes),
         extra = CASE WHEN $5::jsonb IS NULL THEN extra ELSE extra || $5::jsonb END,
         updated_at=now()
     WHERE user_id=$1 AND kind=$2 AND idempotency_key=$3 AND status <> 'released'
     RETURNING id, status, bytes, extra`,
    [
      userId,
      kind,
      String(idempotencyKey).slice(0, 180),
      bytes == null ? null : Number(bytes),
      extra ? JSON.stringify(extra) : null,
    ]
  );
  return r.rows[0] || { skipped: true };
}

async function releaseReservation({ user, kind, idempotencyKey }) {
  if (!isPostgres()) return { skipped: true };
  const userId = userIdOf(user);
  if (!userId || !idempotencyKey) return { skipped: true };
  await query(
    `UPDATE arc.editor_quota_ledger
     SET status='released', updated_at=now()
     WHERE user_id=$1 AND kind=$2 AND idempotency_key=$3 AND status='reserved'`,
    [userId, kind, String(idempotencyKey).slice(0, 180)]
  );
  return { released: true };
}

async function recordPublishedUpload({ user, purpose, url, bytes }) {
  if (!isPostgres() || !url) return;
  const userId = userIdOf(user);
  if (!userId) return;
  const canonical = normalizeAssetUrl(url);
  if (!canonical) return;
  await query(
    `INSERT INTO arc.published_uploads (id, user_id, purpose, url, bytes, extra, created_at)
     VALUES ($1,$2,$3,$4,$5,'{}'::jsonb, now())
     ON CONFLICT (user_id, url) DO NOTHING`,
    [newId(), userId, purpose, canonical, Number(bytes) || 0]
  );
}

const TEAM_ASSET_ROLES = new Set(["owner", "admin", "editor"]);

function asActorId(value) {
  if (!value) return "";
  if (typeof value === "object") {
    return String(value._id || value.id || value.user || "").trim();
  }
  return String(value).trim();
}

function normalizeAssetUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const { classifyImageRef } = require("../utils/imageRef");
    const found = classifyImageRef(raw);
    if (found.action === "store" && found.imageUrl) return found.imageUrl;
  } catch {
    /* fall through */
  }
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return raw.split("?")[0].split("#")[0];
  }
}

function partitionAssetUrls(urls, { existingUrls = [] } = {}) {
  const existing = new Set((existingUrls || []).map(normalizeAssetUrl).filter(Boolean));
  const incoming = [...new Set((urls || []).map(normalizeAssetUrl).filter(Boolean))];
  const alreadyAttached = [];
  const needsProvenance = [];
  for (const url of incoming) {
    if (existing.has(url)) alreadyAttached.push(url);
    else needsProvenance.push(url);
  }
  return { alreadyAttached, needsProvenance, existing };
}

async function collectTeamAssetOwnerIds(teamId) {
  const id = asActorId(teamId);
  if (!id) return [];
  const Team = require("../models/Team");
  const team = await Team.findById(id).select("members").lean();
  return (team?.members || [])
    .filter((member) => TEAM_ASSET_ROLES.has(String(member.role || "")))
    .map((member) => asActorId(member.user))
    .filter(Boolean);
}

async function collectAssetOwnerIds(manhua) {
  const ids = new Set();
  const createdBy = asActorId(manhua?.createdBy);
  if (createdBy) ids.add(createdBy);
  for (const owner of manhua?.owners || []) {
    const id = asActorId(owner);
    if (id) ids.add(id);
  }
  for (const id of await collectTeamAssetOwnerIds(manhua?.team)) ids.add(id);
  return [...ids];
}

async function userOwnsPublishedUrl(userId, url) {
  if (!url || !userId) return false;
  const canonical = normalizeAssetUrl(url);
  const r = await query(
    `SELECT 1 FROM arc.published_uploads WHERE user_id=$1 AND url=$2 LIMIT 1`,
    [String(userId), canonical]
  );
  return r.rowCount > 0;
}

async function assertSelfServeAssetUrls(user, urls, opts = {}) {
  const userId = userIdOf(user);
  if (!(await isSelfServeEditor(userId))) return;
  const { needsProvenance } = partitionAssetUrls(urls, opts);
  if (!needsProvenance.length) return;
  const ownerIds = [...new Set([userId, ...(opts.ownerIds || [])].map(String).filter(Boolean))];
  const r = await query(
    `SELECT DISTINCT url FROM arc.published_uploads
     WHERE user_id = ANY($1::text[]) AND url = ANY($2::text[])`,
    [ownerIds, needsProvenance]
  );
  const owned = new Set(r.rows.map((row) => row.url));
  for (const url of needsProvenance) {
    if (!owned.has(url)) {
      const err = new Error("Энэ зургийг энэ бүртгэл эсвэл багийн гишүүн оруулаагүй тул холбох боломжгүй.");
      err.statusCode = 403;
      err.code = "UPLOAD_OWNERSHIP";
      throw err;
    }
  }
}

module.exports = {
  QuotaError,
  isSelfServeEditor,
  reserveManhua,
  reserveUpload,
  commitReservation,
  releaseReservation,
  recordPublishedUpload,
  userOwnsPublishedUrl,
  assertSelfServeAssetUrls,
  collectAssetOwnerIds,
  collectTeamAssetOwnerIds,
  normalizeAssetUrl,
  partitionAssetUrls,
  formatBytesMn,
  quotaPayload,
};
