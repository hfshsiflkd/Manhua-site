"use strict";

const { isPostgres } = require("../store/driver");
const { query, withTransaction } = require("../db/postgres");
const { newId, asId } = require("../store/pg/helpers");
const cache = require("../utils/cache");
const {
  WORK_ROLES,
  COMPENSATION,
  LISTING_STATUSES,
  EXPERIENCE,
  LANGUAGES,
  DEFAULT_EXPIRE_DAYS,
  MAX_EXPIRE_DAYS,
  isRecruitmentEnabled,
} = require("../config/teamRecruitment");
const {
  isTeamAdminRole,
  getMemberRole,
  addTeamEditorMember,
  lockTeamJoin,
} = require("./teamAccessService");

class FieldError extends Error {
  constructor(fields, message = "Мэдээллээ шалгана уу.") {
    super(message);
    this.name = "FieldError";
    this.statusCode = 400;
    this.code = "VALIDATION";
    this.fields = fields;
  }
}

class HttpError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const PUBLIC_MANHUA_SQL = `
  m.deleted_at IS NULL
  AND coalesce(m.extra->>'quarantinePlaceholder','') IS DISTINCT FROM 'true'
  AND coalesce(m.extra->>'hidden','') IS DISTINCT FROM 'true'
  AND EXISTS (
    SELECT 1 FROM arc.chapters c
    WHERE c.manhua_id = m.id
      AND c.deleted_at IS NULL
      AND c.status = 'published'
      AND coalesce(c.extra->>'quarantinePlaceholder','') IS DISTINCT FROM 'true'
  )
`;

function asString(value) {
  return String(value == null ? "" : value).trim();
}

function assertPostgres() {
  if (!isPostgres()) {
    throw new HttpError(503, "Багийн зар одоогоор боломжгүй.", "RECRUITMENT_UNAVAILABLE");
  }
}

function assertEnabled() {
  if (!isRecruitmentEnabled()) {
    throw new HttpError(403, "Багт нэгдэх зар түр хаагдсан.", "TEAM_RECRUITMENT_DISABLED");
  }
}

function assertActiveAccount(user) {
  if (!user) throw new HttpError(401, "Нэвтэрсэн байх шаардлагатай");
  if (user.blocked || user.isActive === false) {
    throw new HttpError(403, "Энэ бүртгэл идэвхгүй эсвэл хориглогдсон байна.", "ACCOUNT_DISABLED");
  }
  if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
    throw new HttpError(423, "Түр түгжигдсан. Дахин оролдоно уу.", "LOCKED");
  }
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function normalizeStringList(value, allowed, field, min = 0) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  for (const item of list) {
    const code = String(item || "").trim();
    if (allowed && !allowed.includes(code)) continue;
    if (code && !out.includes(code)) out.push(code);
  }
  if (out.length < min) {
    throw new FieldError({ [field]: "Дор хаяж нэгийг сонгоно уу." });
  }
  return out;
}

function validateHttpsUrl(raw, field) {
  const value = asString(raw);
  if (!value) return null;
  if (value.length > 200) {
    throw new FieldError({ [field]: "Холбоос хамгийн ихдээ 200 тэмдэгт байна." });
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      throw new FieldError({ [field]: "Зөвхөн HTTPS холбоос оруулна уу." });
    }
    return parsed.toString();
  } catch (err) {
    if (err instanceof FieldError) throw err;
    throw new FieldError({ [field]: "Зөв HTTPS холбоос оруулна уу." });
  }
}

function pickListingBody(body) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return {
    title: src.title,
    teamId: src.teamId,
    manhuaId: src.manhuaId,
    workRole: src.workRole || src.role,
    description: src.description,
    languages: src.languages,
    skills: src.skills,
    weeklyHoursNote: src.weeklyHoursNote,
    compensation: src.compensation,
    compensationNote: src.compensationNote,
    expiresInDays: src.expiresInDays,
    status: src.status,
  };
}

function pickApplicationBody(body) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return {
    intro: src.intro,
    experience: src.experience,
    weeklyHoursNote: src.weeklyHoursNote,
    portfolioUrl: src.portfolioUrl,
    acceptJoin: src.acceptJoin,
  };
}

function validateListingInput(raw, { partial = false } = {}) {
  const fields = {};
  const title = raw.title === undefined && partial ? undefined : asString(raw.title);
  if (title !== undefined && (title.length < 5 || title.length > 100)) {
    fields.title = "Гарчиг 5–100 тэмдэгт байна.";
  }
  const description = raw.description === undefined && partial ? undefined : asString(raw.description);
  if (description !== undefined && (description.length < 50 || description.length > 2000)) {
    fields.description = "Тайлбар 50–2000 тэмдэгт байна.";
  }
  const workRole = raw.workRole === undefined && partial ? undefined : asString(raw.workRole);
  if (workRole !== undefined && !WORK_ROLES.includes(workRole)) {
    fields.workRole = "Үүргээ сонгоно уу.";
  }
  const compensation = raw.compensation === undefined && partial ? undefined : asString(raw.compensation);
  if (compensation !== undefined && !COMPENSATION.includes(compensation)) {
    fields.compensation = "Нөхцөлөө сонгоно уу.";
  }
  let compensationNote;
  if (raw.compensationNote !== undefined || compensation === "paid" || !partial) {
    compensationNote = asString(raw.compensationNote) || null;
  }
  const effectiveCompensation = compensation;
  if (effectiveCompensation === "paid" && (!compensationNote || compensationNote.length < 5 || compensationNote.length > 500)) {
    fields.compensationNote = "Төлбөртэй бол нөхцөлийн тайлбар 5–500 тэмдэгт байна.";
  } else if (compensationNote && (compensationNote.length < 5 || compensationNote.length > 500)) {
    fields.compensationNote = "Нөхцөлийн тайлбар 5–500 тэмдэгт байна.";
  }
  let weeklyHoursNote;
  if (raw.weeklyHoursNote !== undefined || !partial) {
    weeklyHoursNote = asString(raw.weeklyHoursNote) || null;
    if (weeklyHoursNote && weeklyHoursNote.length > 80) {
      fields.weeklyHoursNote = "Цагийн тайлбар хамгийн ихдээ 80 тэмдэгт байна.";
    }
  }
  let languages;
  if (raw.languages !== undefined || !partial) {
    try {
      languages = normalizeStringList(raw.languages, LANGUAGES, "languages", 1);
    } catch (err) {
      if (err instanceof FieldError) Object.assign(fields, err.fields);
      else throw err;
    }
  }
  let skills;
  if (raw.skills !== undefined || !partial) {
    try {
      skills = normalizeStringList(raw.skills, WORK_ROLES, "skills", 0);
    } catch (err) {
      if (err instanceof FieldError) Object.assign(fields, err.fields);
      else throw err;
    }
  }
  let status;
  if (raw.status !== undefined) {
    status = asString(raw.status);
    if (!LISTING_STATUSES.includes(status)) fields.status = "Төлөв буруу байна.";
  }
  let expiresInDays;
  if (raw.expiresInDays !== undefined || !partial) {
    const n = Number(raw.expiresInDays == null || raw.expiresInDays === "" ? DEFAULT_EXPIRE_DAYS : raw.expiresInDays);
    if (!Number.isInteger(n) || n < 1 || n > MAX_EXPIRE_DAYS) {
      fields.expiresInDays = "Дуусах хугацаа 1–90 хоног байна.";
    } else {
      expiresInDays = n;
    }
  }
  if (raw.manhuaId !== undefined && raw.manhuaId && !isValidId(raw.manhuaId)) {
    fields.manhuaId = "Манхва буруу байна.";
  }
  if (Object.keys(fields).length) throw new FieldError(fields);
  return {
    title,
    description,
    workRole,
    compensation,
    compensationNote: compensationNote === undefined ? undefined : compensationNote,
    weeklyHoursNote: weeklyHoursNote === undefined ? undefined : weeklyHoursNote,
    languages,
    skills,
    status,
    expiresInDays,
    manhuaId: raw.manhuaId === undefined ? undefined : raw.manhuaId ? asId(raw.manhuaId) : null,
    teamId: raw.teamId,
  };
}

function validateApplicationInput(raw) {
  const fields = {};
  const intro = asString(raw.intro);
  if (intro.length < 20 || intro.length > 1000) fields.intro = "Танилцуулга 20–1000 тэмдэгт байна.";
  const experience = asString(raw.experience);
  if (!EXPERIENCE.includes(experience)) fields.experience = "Туршлагаа сонгоно уу.";
  const weeklyHoursNote = asString(raw.weeklyHoursNote);
  if (!weeklyHoursNote || weeklyHoursNote.length > 80) fields.weeklyHoursNote = "Боломжтой цагаа 1–80 тэмдэгтээр бичнэ үү.";
  let portfolioUrl = null;
  try {
    portfolioUrl = validateHttpsUrl(raw.portfolioUrl, "portfolioUrl");
  } catch (err) {
    if (err instanceof FieldError) Object.assign(fields, err.fields);
    else throw err;
  }
  if (raw.acceptJoin !== true) {
    fields.acceptJoin = "Зөвшөөрөгдвөл багт гишүүнээр нэмэгдэхийг зөвшөөрнө үү.";
  }
  if (Object.keys(fields).length) throw new FieldError(fields);
  return { intro, experience, weeklyHoursNote, portfolioUrl };
}

function isListingAccepting(row) {
  if (!row) return false;
  if (row.hidden_at) return false;
  if (row.status !== "open") return false;
  if (new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
}

function publicManhua(row) {
  if (!row || !row.manhua_public) return null;
  return {
    id: row.manhua_id,
    title: row.manhua_title,
    slug: row.manhua_slug,
    coverImage: row.manhua_cover || null,
  };
}

function toPublicListing(row) {
  const expired = !row.hidden_at && new Date(row.expires_at).getTime() <= Date.now();
  const closed = row.status !== "open" || expired || Boolean(row.hidden_at);
  return {
    id: row.id,
    title: row.title,
    team: { id: row.team_id, name: row.team_name },
    manhua: publicManhua(row),
    workRole: row.work_role,
    compensation: row.compensation,
    compensationNote: row.compensation === "paid" || row.compensation === "negotiable" ? row.compensation_note : null,
    compensationDisclaimer: "Энэ нөхцөлийг баг нийтэлсэн. Төлбөр шилжүүлэлт энэ сайтаар хийгдэхгүй.",
    description: row.description,
    languages: row.languages || [],
    skills: row.skills || [],
    weeklyHoursNote: row.weekly_hours_note || null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    accepting: isListingAccepting(row),
    closed,
    expired,
  };
}

function toOwnerListing(row) {
  return {
    ...toPublicListing(row),
    status: row.status,
    hidden: Boolean(row.hidden_at),
    manhuaId: row.manhua_id,
    pendingCount: Number(row.pending_count || 0),
    createdBy: row.created_by,
  };
}

function toApplicantPublic(row) {
  const displayName = String(row.pen_name || row.username || "Үл мэдэгдэх").trim();
  return {
    id: row.applicant_id,
    displayName,
    avatar: row.avatar || null,
    publicPath: `/creators/${row.applicant_id}`,
  };
}

function toPrivateApplication(row, { includeApplicant = false } = {}) {
  const dto = {
    id: row.id,
    listingId: row.listing_id,
    teamId: row.team_id,
    teamName: row.team_name,
    listingTitle: row.listing_title,
    status: row.status,
    intro: row.intro,
    experience: row.experience,
    weeklyHoursNote: row.weekly_hours_note,
    portfolioUrl: row.portfolio_url || null,
    decisionNote: row.status === "rejected" ? row.decision_note || null : null,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
  if (includeApplicant) dto.applicant = toApplicantPublic(row);
  return dto;
}

const LISTING_SELECT = `
  l.*,
  t.name AS team_name,
  m.title AS manhua_title,
  m.slug AS manhua_slug,
  coalesce(m.cover_image, m.cover_image_url) AS manhua_cover,
  (${PUBLIC_MANHUA_SQL.replace(/m\./g, "m.")}) AS manhua_public
`;

async function loadListing(id) {
  const r = await query(
    `SELECT ${LISTING_SELECT}
     FROM arc.team_recruitment_listings l
     JOIN arc.teams t ON t.id = l.team_id
     LEFT JOIN arc.manhuas m ON m.id = l.manhua_id
     WHERE l.id=$1`,
    [id]
  );
  return r.rows[0] || null;
}

async function assertTeamAdmin(user, teamId) {
  if (String(user.role || "") === "admin") return "site-admin";
  const role = await getMemberRole(teamId, user._id || user.id);
  if (!isTeamAdminRole(role)) {
    throw new HttpError(403, "Зөвхөн багийн owner/admin зар удирдана.", "FORBIDDEN");
  }
  return role;
}

async function assertManhuaOnTeam(manhuaId, teamId) {
  if (!manhuaId) return;
  const r = await query(
    `SELECT id FROM arc.manhuas WHERE id=$1 AND team_id=$2 AND deleted_at IS NULL`,
    [manhuaId, teamId]
  );
  if (!r.rowCount) {
    throw new FieldError({ manhuaId: "Зөвхөн энэ багийн бүтээлийг сонгоно уу." });
  }
}

async function listPublicListings(queryParams = {}) {
  assertPostgres();
  const page = Math.max(1, Number(queryParams.page) || 1);
  const limit = Math.min(24, Math.max(1, Number(queryParams.limit) || 12));
  const offset = (page - 1) * limit;
  const workRole = asString(queryParams.workRole || queryParams.role);
  const compensation = asString(queryParams.compensation);
  const q = asString(queryParams.q);
  const manhuaId = asString(queryParams.manhuaId);
  const params = [];
  const clauses = [
    `l.status = 'open'`,
    `l.hidden_at IS NULL`,
    `l.expires_at > now()`,
  ];
  if (WORK_ROLES.includes(workRole)) {
    params.push(workRole);
    clauses.push(`l.work_role = $${params.length}`);
  }
  if (COMPENSATION.includes(compensation)) {
    params.push(compensation);
    clauses.push(`l.compensation = $${params.length}`);
  }
  if (manhuaId && isValidId(manhuaId)) {
    params.push(manhuaId);
    clauses.push(`l.manhua_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
    const p = `$${params.length}`;
    clauses.push(`(
      l.title ILIKE ${p} ESCAPE '\\'
      OR t.name ILIKE ${p} ESCAPE '\\'
      OR (
        m.title ILIKE ${p} ESCAPE '\\'
        AND (${PUBLIC_MANHUA_SQL})
      )
    )`);
  }
  const where = clauses.join(" AND ");
  const count = await query(
    `SELECT count(*)::int AS n
     FROM arc.team_recruitment_listings l
     JOIN arc.teams t ON t.id = l.team_id
     LEFT JOIN arc.manhuas m ON m.id = l.manhua_id
     WHERE ${where}`,
    params
  );
  params.push(limit, offset);
  const rows = await query(
    `SELECT ${LISTING_SELECT}
     FROM arc.team_recruitment_listings l
     JOIN arc.teams t ON t.id = l.team_id
     LEFT JOIN arc.manhuas m ON m.id = l.manhua_id
     WHERE ${where}
     ORDER BY l.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    items: rows.rows.map(toPublicListing),
    page,
    limit,
    total: count.rows[0].n,
  };
}

async function getPublicListing(id) {
  assertPostgres();
  if (!isValidId(id)) throw new HttpError(400, "ID буруу байна");
  const row = await loadListing(id);
  if (!row || row.hidden_at || row.status === "draft") {
    throw new HttpError(404, "Зар олдсонгүй");
  }
  return toPublicListing(row);
}

async function createListing(user, body) {
  assertPostgres();
  assertEnabled();
  assertActiveAccount(user);
  const raw = pickListingBody(body);
  if (!isValidId(raw.teamId)) throw new FieldError({ teamId: "Багаа сонгоно уу." });
  await assertTeamAdmin(user, raw.teamId);
  const data = validateListingInput(raw);
  await assertManhuaOnTeam(data.manhuaId, raw.teamId);
  const extra = user.extra?.pgitest ? { pgitest: true } : {};
  const expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
  const id = newId();
  await query(
    `INSERT INTO arc.team_recruitment_listings (
      id, team_id, created_by, manhua_id, title, work_role, compensation, compensation_note,
      description, languages, skills, weekly_hours_note, status, expires_at, extra, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11::text[],$12,$13,$14,$15::jsonb,now(),now()
    )`,
    [
      id,
      raw.teamId,
      asId(user._id || user.id),
      data.manhuaId,
      data.title,
      data.workRole,
      data.compensation,
      data.compensationNote,
      data.description,
      data.languages,
      data.skills || [],
      data.weeklyHoursNote,
      data.status || "open",
      expiresAt,
      JSON.stringify(extra),
    ]
  );
  return toOwnerListing(await loadListing(id));
}

async function listTeamListings(user, teamId) {
  assertPostgres();
  if (!isValidId(teamId)) throw new HttpError(400, "ID буруу байна");
  await assertTeamAdmin(user, teamId);
  const r = await query(
    `SELECT ${LISTING_SELECT},
       (SELECT count(*)::int FROM arc.team_recruitment_applications a
        WHERE a.listing_id = l.id AND a.status='pending') AS pending_count
     FROM arc.team_recruitment_listings l
     JOIN arc.teams t ON t.id = l.team_id
     LEFT JOIN arc.manhuas m ON m.id = l.manhua_id
     WHERE l.team_id=$1
     ORDER BY l.created_at DESC`,
    [teamId]
  );
  return r.rows.map(toOwnerListing);
}

async function getOwnerListing(user, id) {
  assertPostgres();
  if (!isValidId(id)) throw new HttpError(400, "ID буруу байна");
  const row = await loadListing(id);
  if (!row) throw new HttpError(404, "Зар олдсонгүй");
  await assertTeamAdmin(user, row.team_id);
  const count = await query(
    `SELECT count(*)::int AS n FROM arc.team_recruitment_applications WHERE listing_id=$1 AND status='pending'`,
    [id]
  );
  row.pending_count = count.rows[0].n;
  return toOwnerListing(row);
}

async function updateListing(user, id, body) {
  assertPostgres();
  assertEnabled();
  assertActiveAccount(user);
  if (!isValidId(id)) throw new HttpError(400, "ID буруу байна");
  const row = await loadListing(id);
  if (!row) throw new HttpError(404, "Зар олдсонгүй");
  await assertTeamAdmin(user, row.team_id);
  if (row.hidden_at) {
    throw new HttpError(403, "Модерациар нуусан зарыг сэргээх боломжгүй.", "LISTING_HIDDEN");
  }
  const data = validateListingInput(pickListingBody({ ...body, teamId: row.team_id }), { partial: true });
  if (data.manhuaId !== undefined) await assertManhuaOnTeam(data.manhuaId, row.team_id);
  const next = {
    title: data.title !== undefined ? data.title : row.title,
    description: data.description !== undefined ? data.description : row.description,
    work_role: data.workRole !== undefined ? data.workRole : row.work_role,
    compensation: data.compensation !== undefined ? data.compensation : row.compensation,
    compensation_note: data.compensationNote !== undefined ? data.compensationNote : row.compensation_note,
    weekly_hours_note: data.weeklyHoursNote !== undefined ? data.weeklyHoursNote : row.weekly_hours_note,
    languages: data.languages !== undefined ? data.languages : row.languages,
    skills: data.skills !== undefined ? data.skills : row.skills,
    status: data.status !== undefined ? data.status : row.status,
    manhua_id: data.manhuaId !== undefined ? data.manhuaId : row.manhua_id,
    expires_at: row.expires_at,
  };
  if (next.compensation === "paid" && (!next.compensation_note || String(next.compensation_note).length < 5)) {
    throw new FieldError({ compensationNote: "Төлбөртэй бол нөхцөлийн тайлбар шаардлагатай." });
  }
  if (data.expiresInDays) {
    next.expires_at = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
  }
  await query(
    `UPDATE arc.team_recruitment_listings SET
      title=$2, description=$3, work_role=$4, compensation=$5, compensation_note=$6,
      weekly_hours_note=$7, languages=$8::text[], skills=$9::text[], status=$10,
      manhua_id=$11, expires_at=$12, updated_at=now()
     WHERE id=$1`,
    [
      id,
      next.title,
      next.description,
      next.work_role,
      next.compensation,
      next.compensation_note,
      next.weekly_hours_note,
      next.languages,
      next.skills,
      next.status,
      next.manhua_id,
      next.expires_at,
    ]
  );
  return getOwnerListing(user, id);
}

async function setListingStatus(user, id, status) {
  return updateListing(user, id, { status });
}

async function hideListing(adminUser, id) {
  assertPostgres();
  if (String(adminUser.role || "") !== "admin") {
    throw new HttpError(403, "Зөвхөн site admin нууна.", "FORBIDDEN");
  }
  if (!isValidId(id)) throw new HttpError(400, "ID буруу байна");
  const r = await query(
    `UPDATE arc.team_recruitment_listings
     SET hidden_at=now(), hidden_by=$2, updated_at=now()
     WHERE id=$1 AND hidden_at IS NULL
     RETURNING id`,
    [id, asId(adminUser._id || adminUser.id)]
  );
  if (!r.rowCount) throw new HttpError(404, "Зар олдсонгүй");
  return { ok: true };
}

async function applyToListing(user, listingId, body) {
  assertPostgres();
  assertEnabled();
  assertActiveAccount(user);
  if (!isValidId(listingId)) throw new HttpError(400, "ID буруу байна");
  const data = validateApplicationInput(pickApplicationBody(body));
  const userId = asId(user._id || user.id);
  const extra = user.extra?.pgitest ? { pgitest: true } : {};

  return withTransaction(async (client) => {
    const listingRes = await client.query(
      `SELECT l.*, t.id AS team_exists
       FROM arc.team_recruitment_listings l
       JOIN arc.teams t ON t.id = l.team_id
       WHERE l.id=$1
       FOR UPDATE OF l`,
      [listingId]
    );
    const listing = listingRes.rows[0];
    if (!listing || listing.hidden_at || listing.status === "draft") {
      throw new HttpError(404, "Зар олдсонгүй");
    }
    if (!isListingAccepting(listing)) {
      throw new HttpError(400, "Хүсэлт авах хугацаа дууссан.", "LISTING_CLOSED");
    }
    const member = await client.query(
      `SELECT role FROM arc.team_members WHERE team_id=$1 AND user_id=$2`,
      [listing.team_id, userId]
    );
    if (member.rowCount) {
      throw new HttpError(400, "Та энэ багийн гишүүн тул хүсэлт илгээхгүй.", "ALREADY_MEMBER");
    }
    const id = newId();
    try {
      await client.query(
        `INSERT INTO arc.team_recruitment_applications (
          id, listing_id, team_id, applicant_id, intro, experience, weekly_hours_note,
          portfolio_url, status, extra, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9::jsonb,now(),now())`,
        [
          id,
          listingId,
          listing.team_id,
          userId,
          data.intro,
          data.experience,
          data.weeklyHoursNote,
          data.portfolioUrl,
          JSON.stringify(extra),
        ]
      );
    } catch (err) {
      if (err && err.code === "23505") {
        throw new HttpError(409, "Энэ зар дээр хүсэлт аль хэдийн илгээгдсэн.", "DUPLICATE_APPLICATION");
      }
      throw err;
    }
    const saved = await client.query(`SELECT * FROM arc.team_recruitment_applications WHERE id=$1`, [id]);
    saved.rows[0].team_name = listing.team_id;
    saved.rows[0].listing_title = listing.title;
    return toPrivateApplication({ ...saved.rows[0], team_name: null, listing_title: listing.title });
  });
}

async function listMyApplications(user) {
  assertPostgres();
  assertActiveAccount(user);
  const r = await query(
    `SELECT a.*, l.title AS listing_title, t.name AS team_name
     FROM arc.team_recruitment_applications a
     JOIN arc.team_recruitment_listings l ON l.id = a.listing_id
     JOIN arc.teams t ON t.id = a.team_id
     WHERE a.applicant_id=$1
     ORDER BY a.created_at DESC`,
    [asId(user._id || user.id)]
  );
  return r.rows.map((row) => toPrivateApplication(row));
}

async function withdrawApplication(user, applicationId) {
  assertPostgres();
  assertEnabled();
  assertActiveAccount(user);
  if (!isValidId(applicationId)) throw new HttpError(400, "ID буруу байна");
  const userId = asId(user._id || user.id);
  return withTransaction(async (client) => {
    const peek = await client.query(
      `SELECT team_id, applicant_id FROM arc.team_recruitment_applications WHERE id=$1`,
      [applicationId]
    );
    if (!peek.rowCount) throw new HttpError(404, "Хүсэлт олдсонгүй");
    await lockTeamJoin(client, peek.rows[0].team_id, peek.rows[0].applicant_id);
    const r = await client.query(
      `SELECT * FROM arc.team_recruitment_applications WHERE id=$1 FOR UPDATE`,
      [applicationId]
    );
    const row = r.rows[0];
    if (!row || String(row.applicant_id) !== String(userId)) {
      throw new HttpError(404, "Хүсэлт олдсонгүй");
    }
    if (row.status !== "pending") {
      throw new HttpError(400, "Зөвхөн хүлээгдэж буй хүсэлтийг цуцална.", "NOT_PENDING");
    }
    await client.query(
      `UPDATE arc.team_recruitment_applications
       SET status='withdrawn', decided_at=now(), updated_at=now()
       WHERE id=$1 AND status='pending'`,
      [applicationId]
    );
    return { ok: true, status: "withdrawn" };
  });
}

async function listListingApplications(user, listingId, status) {
  assertPostgres();
  if (!isValidId(listingId)) throw new HttpError(400, "ID буруу байна");
  const listing = await loadListing(listingId);
  if (!listing) throw new HttpError(404, "Зар олдсонгүй");
  await assertTeamAdmin(user, listing.team_id);
  const params = [listingId];
  let extra = "";
  if (status && ["pending", "accepted", "rejected", "withdrawn"].includes(status)) {
    params.push(status);
    extra = ` AND a.status=$${params.length}`;
  }
  const r = await query(
    `SELECT a.*, l.title AS listing_title, t.name AS team_name,
            u.username, u.avatar, ep.pen_name
     FROM arc.team_recruitment_applications a
     JOIN arc.team_recruitment_listings l ON l.id = a.listing_id
     JOIN arc.teams t ON t.id = a.team_id
     JOIN arc.users u ON u.id = a.applicant_id
     LEFT JOIN arc.editor_profiles ep ON ep.user_id = u.id
     WHERE a.listing_id=$1${extra}
     ORDER BY a.created_at DESC`,
    params
  );
  return r.rows.map((row) => toPrivateApplication(row, { includeApplicant: true }));
}

async function decideApplication(user, applicationId, { action, decisionNote }) {
  assertPostgres();
  assertEnabled();
  assertActiveAccount(user);
  if (!isValidId(applicationId)) throw new HttpError(400, "ID буруу байна");
  const actorId = asId(user._id || user.id);
  const wantAccept = action === "accept";
  const wantReject = action === "reject";
  if (!wantAccept && !wantReject) {
    throw new HttpError(400, "Зөвшөөрөх эсвэл татгалзах үйлдэл шаардлагатай.");
  }
  let note = asString(decisionNote) || null;
  if (wantReject) {
    if (!note || note.length > 300) {
      throw new FieldError({ decisionNote: "Татгалзсан тайлбар 1–300 тэмдэгт байна." });
    }
  } else {
    note = null;
  }

  return withTransaction(async (client) => {
    const peek = await client.query(
      `SELECT team_id, applicant_id FROM arc.team_recruitment_applications WHERE id=$1`,
      [applicationId]
    );
    if (!peek.rowCount) throw new HttpError(404, "Хүсэлт олдсонгүй");
    await lockTeamJoin(client, peek.rows[0].team_id, peek.rows[0].applicant_id);
    const appRes = await client.query(
      `SELECT * FROM arc.team_recruitment_applications WHERE id=$1 FOR UPDATE`,
      [applicationId]
    );
    const app = appRes.rows[0];
    if (!app) throw new HttpError(404, "Хүсэлт олдсонгүй");
    if (app.status !== "pending") {
      throw new HttpError(409, "Хүсэлтийн төлөв өөрчлөгдсөн.", "NOT_PENDING");
    }

    const listingRes = await client.query(
      `SELECT * FROM arc.team_recruitment_listings WHERE id=$1 FOR UPDATE`,
      [app.listing_id]
    );
    const listing = listingRes.rows[0];
    if (!listing) throw new HttpError(400, "Зар олдсонгүй");

    const actorRole = String(user.role || "") === "admin"
      ? "site-admin"
      : (await client.query(
          `SELECT role FROM arc.team_members WHERE team_id=$1 AND user_id=$2`,
          [app.team_id, actorId]
        )).rows[0]?.role;
    if (actorRole !== "site-admin" && !isTeamAdminRole(actorRole)) {
      throw new HttpError(403, "Шийдвэр гаргах эрхгүй.", "FORBIDDEN");
    }

    if (wantReject) {
      const upd = await client.query(
        `UPDATE arc.team_recruitment_applications
         SET status='rejected', decision_note=$2, decided_by=$3, decided_at=now(), updated_at=now()
         WHERE id=$1 AND status='pending'
         RETURNING id`,
        [applicationId, note, actorId]
      );
      if (!upd.rowCount) throw new HttpError(409, "Хүсэлтийн төлөв өөрчлөгдсөн.", "NOT_PENDING");
      return { ok: true, status: "rejected" };
    }

    if (!isListingAccepting(listing)) {
      throw new HttpError(400, "Хаалттай эсвэл хугацаа дууссан зар дээр зөвшөөрөхгүй.", "LISTING_CLOSED");
    }
    const teamRes = await client.query(`SELECT id FROM arc.teams WHERE id=$1`, [app.team_id]);
    if (!teamRes.rowCount) throw new HttpError(400, "Баг олдсонгүй");

    const applicant = await client.query(
      `SELECT id, role, blocked, is_active, lock_until FROM arc.users WHERE id=$1 FOR UPDATE`,
      [app.applicant_id]
    );
    const person = applicant.rows[0];
    if (!person || person.blocked || person.is_active === false) {
      throw new HttpError(400, "Хүсэлт гаргагчийн бүртгэл идэвхгүй эсвэл хориглогдсон.", "APPLICANT_DISABLED");
    }
    if (person.lock_until && new Date(person.lock_until).getTime() > Date.now()) {
      throw new HttpError(400, "Хүсэлт гаргагч түр түгжигдсэн.", "APPLICANT_LOCKED");
    }

    const upd = await client.query(
      `UPDATE arc.team_recruitment_applications
       SET status='accepted', decided_by=$2, decided_at=now(), updated_at=now()
       WHERE id=$1 AND status='pending'
       RETURNING id`,
      [applicationId, actorId]
    );
    if (!upd.rowCount) throw new HttpError(409, "Хүсэлтийн төлөв өөрчлөгдсөн.", "NOT_PENDING");

    await addTeamEditorMember(client, {
      teamId: app.team_id,
      userId: app.applicant_id,
      addedBy: actorId,
    });
    cache.del(`editor:manhuas:mine:${String(app.applicant_id)}`);
    return {
      ok: true,
      status: "accepted",
      membershipRole: "editor",
      siteRoleUnchanged: true,
      applicantId: app.applicant_id,
    };
  });
}

module.exports = {
  FieldError,
  HttpError,
  isListingAccepting,
  toPublicListing,
  toPrivateApplication,
  listPublicListings,
  getPublicListing,
  createListing,
  listTeamListings,
  getOwnerListing,
  updateListing,
  setListingStatus,
  hideListing,
  applyToListing,
  listMyApplications,
  withdrawApplication,
  listListingApplications,
  decideApplication,
  validateListingInput,
  validateApplicationInput,
  pickListingBody,
  pickApplicationBody,
};
