"use strict";

const { isPostgres } = require("../store/driver");
const { query, withTransaction } = require("../db/postgres");
const redisCache = require("../cache/redisCache");
const { invalidatePublicManhuaCache } = require("../utils/invalidatePublicManhuaCache");
const {
  FieldError,
  pickProfileUpdate,
  validateProfileUpdate,
  rowToProfile,
} = require("./editorOnboardingService");

const PUBLIC_ROLES = new Set(["editor", "admin", "translator"]);
const PRIVATE_KEYS = [
  "email",
  "password",
  "password_hash",
  "jwt",
  "token",
  "session",
  "session_token",
  "token_version",
  "device",
  "device_id",
  "last_device_id",
  "ip",
  "last_register_ip",
  "vip",
  "is_vip",
  "isVIP",
  "vip_expires_at",
  "vipExpiresAt",
  "finance",
  "quota",
  "ledger",
  "audit",
  "terms_version",
  "termsVersion",
  "terms_accepted_at",
  "termsAcceptedAt",
  "self_serve",
  "selfServe",
  "extra",
  "lock_until",
  "lockUntil",
  "lock_reason",
  "phone",
  "reset_password",
  "blocked",
  "is_active",
  "role",
];

const PUBLIC_MANHUA_SQL = `
  m.deleted_at IS NULL
  AND coalesce(m.extra->>'quarantinePlaceholder','') IS DISTINCT FROM 'true'
  AND EXISTS (
    SELECT 1 FROM arc.chapters c
    WHERE c.manhua_id = m.id
      AND c.deleted_at IS NULL
      AND c.status = 'published'
      AND coalesce(c.extra->>'quarantinePlaceholder','') IS DISTINCT FROM 'true'
      AND coalesce(c.extra->>'hiddenBecauseParentDeleted','') IS DISTINCT FROM 'true'
  )
`;

function canonicalSiteOrigin() {
  const raw = process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.arc-read.com";
  try {
    const u = new URL(raw);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return "https://www.arc-read.com";
    }
    return `${u.protocol}//${u.host}`.replace(/\/$/, "");
  } catch {
    return "https://www.arc-read.com";
  }
}

function publicPathFor(userId) {
  return `/creators/${userId}`;
}

function publicUrlFor(userId) {
  return `${canonicalSiteOrigin()}${publicPathFor(userId)}`;
}

function isVisibleAccount(row) {
  if (!row) return false;
  if (row.blocked) return false;
  if (row.is_active === false) return false;
  return true;
}

function displayNameFrom(row) {
  const pen = String(row.pen_name || "").trim();
  if (pen) return pen;
  return String(row.username || "").trim() || "Үл мэдэгдэх";
}

function publicManhuaCard(row) {
  return {
    _id: row.id,
    title: row.title,
    titleEn: row.title_en || null,
    slug: row.slug,
    coverImage: row.cover_image || row.cover_image_url || null,
    status: row.status,
    updatedAt: row.updated_at,
    views: Number(row.views || 0),
    ratingAverage: Number(row.rating_average || 0),
  };
}

function toPublicCreator(row, { manhuas, page, limit, total }) {
  return {
    id: row.id,
    displayName: displayNameFrom(row),
    avatar: row.avatar || null,
    bio: row.bio ? String(row.bio) : null,
    skills: Array.isArray(row.skills) ? row.skills : [],
    languages: Array.isArray(row.languages) ? row.languages : [],
    portfolioUrl: row.portfolio_url || null,
    publishedCount: total,
    manhuas,
    page,
    limit,
  };
}

function toPrivateCreator(row, { hasProfile }) {
  return {
    penName: hasProfile ? row.pen_name : row.username,
    bio: hasProfile ? row.bio : "",
    skills: hasProfile && Array.isArray(row.skills) ? row.skills : [],
    experience: hasProfile ? row.experience : "",
    languages: hasProfile && Array.isArray(row.languages) ? row.languages : [],
    portfolioUrl: hasProfile ? row.portfolio_url || null : null,
    hasProfile,
    publicPath: publicPathFor(row.id),
    publicUrl: publicUrlFor(row.id),
  };
}

function assertStaffRole(user) {
  const role = String(user?.role || "user");
  if (!PUBLIC_ROLES.has(role)) {
    const err = new Error("Зөвхөн editor профайлаа засах боломжтой.");
    err.statusCode = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
  if (user.blocked || user.isActive === false) {
    const err = new Error("Энэ бүртгэл идэвхгүй эсвэл хориглогдсон байна.");
    err.statusCode = 403;
    err.code = "ACCOUNT_DISABLED";
    throw err;
  }
}

async function countPublicManhuas(userId) {
  const r = await query(
    `SELECT count(*)::int AS n FROM arc.manhuas m WHERE m.created_by=$1 AND ${PUBLIC_MANHUA_SQL}`,
    [userId]
  );
  return r.rows[0].n;
}

async function listPublicManhuas(userId, { page, limit }) {
  const offset = (page - 1) * limit;
  const r = await query(
    `SELECT m.id, m.title, m.title_en, m.slug, m.cover_image, m.cover_image_url,
            m.status, m.updated_at, m.views, m.rating_average
     FROM arc.manhuas m
     WHERE m.created_by=$1 AND ${PUBLIC_MANHUA_SQL}
     ORDER BY m.updated_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return r.rows.map(publicManhuaCard);
}

async function loadCreatorRow(userId) {
  const r = await query(
    `SELECT u.id, u.username, u.avatar, u.role, u.blocked, u.is_active,
            p.pen_name, p.bio, p.skills, p.experience, p.languages, p.portfolio_url
     FROM arc.users u
     LEFT JOIN arc.editor_profiles p ON p.user_id = u.id
     WHERE u.id=$1`,
    [userId]
  );
  return r.rows[0] || null;
}

async function invalidateCreatorCaches(userId) {
  await redisCache.delPrefix(`creator:public:${userId}:`);
  const slugs = await query(`SELECT slug FROM arc.manhuas WHERE created_by=$1 AND deleted_at IS NULL`, [userId]);
  await Promise.all(slugs.rows.map((row) => redisCache.del(`manhua:slug:${row.slug}`)));
}

async function getPublicCreator(id, queryParams = {}) {
  if (!isPostgres()) {
    const err = new Error("Профайл одоогоор боломжгүй.");
    err.statusCode = 503;
    throw err;
  }
  const userId = String(id || "").trim();
  if (!userId || userId.length > 64) {
    const err = new Error("Профайл олдсонгүй");
    err.statusCode = 404;
    throw err;
  }
  const page = Math.max(1, Number(queryParams.page) || 1);
  const limit = Math.min(24, Math.max(1, Number(queryParams.limit) || 12));
  const cacheKey = `creator:public:${userId}:${page}:${limit}`;
  const cached = await redisCache.get(cacheKey);
  const row = await loadCreatorRow(userId);
  if (!row || !isVisibleAccount(row)) {
    await redisCache.delPrefix(`creator:public:${userId}:`);
    const err = new Error("Профайл олдсонгүй");
    err.statusCode = 404;
    throw err;
  }
  const total = await countPublicManhuas(userId);
  const role = String(row.role || "user");
  if (!PUBLIC_ROLES.has(role) && total === 0) {
    const err = new Error("Профайл олдсонгүй");
    err.statusCode = 404;
    throw err;
  }
  if (cached) return cached;
  const manhuas = await listPublicManhuas(userId, { page, limit });
  const dto = toPublicCreator(row, { manhuas, page, limit, total });
  await redisCache.set(cacheKey, dto, 60);
  return dto;
}

async function getOwnCreatorProfile(user) {
  if (!isPostgres()) {
    const err = new Error("Профайл одоогоор боломжгүй.");
    err.statusCode = 503;
    throw err;
  }
  assertStaffRole(user);
  const userId = String(user._id || user.id);
  const row = await loadCreatorRow(userId);
  if (!row) {
    const err = new Error("Хэрэглэгч олдсонгүй");
    err.statusCode = 404;
    throw err;
  }
  const hasProfile = Boolean(row.pen_name);
  return toPrivateCreator(row, { hasProfile });
}

async function updateOwnCreatorProfile(user, body) {
  if (!isPostgres()) {
    const err = new Error("Профайл одоогоор боломжгүй.");
    err.statusCode = 503;
    throw err;
  }
  assertStaffRole(user);
  const profile = validateProfileUpdate(pickProfileUpdate(body));
  const userId = String(user._id || user.id);

  await withTransaction(async (client) => {
    const locked = await client.query(
      `SELECT u.id, u.role, u.blocked, u.is_active, u.created_at, u.extra AS user_extra,
              p.user_id AS profile_id, p.self_serve, p.experience, p.terms_version, p.terms_accepted_at
       FROM arc.users u
       LEFT JOIN arc.editor_profiles p ON p.user_id = u.id
       WHERE u.id=$1
       FOR UPDATE OF u`,
      [userId]
    );
    if (!locked.rowCount) {
      const err = new Error("Хэрэглэгч олдсонгүй");
      err.statusCode = 404;
      throw err;
    }
    const row = locked.rows[0];
    assertStaffRole({
      role: row.role,
      blocked: row.blocked,
      isActive: row.is_active,
    });
    const extra = row.user_extra && typeof row.user_extra === "object" ? row.user_extra : {};
    const experience = profile.experience || row.experience || "previous";
    if (row.profile_id) {
      await client.query(
        `UPDATE arc.editor_profiles SET
           pen_name=$2, bio=$3, skills=$4::text[], languages=$5::text[],
           portfolio_url=$6, experience=$7, updated_at=now()
         WHERE user_id=$1`,
        [userId, profile.penName, profile.bio, profile.skills, profile.languages, profile.portfolioUrl, experience]
      );
    } else {
      await client.query(
        `INSERT INTO arc.editor_profiles (
           user_id, pen_name, bio, skills, experience, languages, portfolio_url,
           terms_version, terms_accepted_at, self_serve, extra, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4::text[],$5,$6::text[],$7,'legacy-profile',$8,false,$9::jsonb, now(), now()
         )`,
        [
          userId,
          profile.penName,
          profile.bio,
          profile.skills,
          experience,
          profile.languages,
          profile.portfolioUrl,
          row.created_at,
          JSON.stringify(extra.pgitest ? { pgitest: true } : {}),
        ]
      );
    }
  });

  await invalidateCreatorCaches(userId);
  await invalidatePublicManhuaCache();
  return getOwnCreatorProfile(user);
}

async function creditForManhua(manhua) {
  const createdById = manhua && (manhua.createdBy?._id || manhua.createdBy || manhua.created_by);
  let publisher = { id: null, displayName: "Үл мэдэгдэх", href: null };
  if (createdById) {
    try {
      const row = await loadCreatorRow(String(createdById));
      if (row) {
        const visible = isVisibleAccount(row);
        publisher = {
          id: visible ? row.id : null,
          displayName: displayNameFrom(row),
          href: visible ? publicPathFor(row.id) : null,
        };
      }
    } catch {
      publisher = { id: null, displayName: "Үл мэдэгдэх", href: null };
    }
  }

  let team = null;
  const teamId = manhua && (manhua.team?._id || manhua.team || manhua.team_id);
  if (teamId) {
    try {
      const t = await query(`SELECT id, name FROM arc.teams WHERE id=$1`, [String(teamId)]);
      if (t.rowCount && String(t.rows[0].name || "").trim()) {
        team = { id: t.rows[0].id, name: String(t.rows[0].name).trim(), href: null };
      }
    } catch {
      team = null;
    }
  }
  return { publisher, team };
}

module.exports = {
  FieldError,
  PRIVATE_KEYS,
  canonicalSiteOrigin,
  publicPathFor,
  publicUrlFor,
  getPublicCreator,
  getOwnCreatorProfile,
  updateOwnCreatorProfile,
  creditForManhua,
  invalidateCreatorCaches,
  toPublicCreator,
  rowToProfile,
};
