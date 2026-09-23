"use strict";

const { isPostgres } = require("../store/driver");
const { query, withTransaction } = require("../db/postgres");
const { newId } = require("../store/pg/helpers");
const Team = require("../models/Team");
const {
  TERMS_VERSION,
  NAME_MIN,
  NAME_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  ACTIVE_TEAM_LIMIT,
  isSelfServeTeamCreationEnabled,
  canCreateTeam,
  activeOwnerLimitReached,
} = require("../config/selfServeTeam");

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

function charLen(value) {
  return Array.from(String(value || "")).length;
}

function userIdOf(user) {
  return String(user?._id || user?.id || "");
}

function isSiteAdmin(user) {
  return String(user?.role || "") === "admin";
}

function assertActiveAccount(user) {
  if (!user) throw new HttpError(401, "Нэвтэрсэн байх шаардлагатай");
  if (user.blocked || user.isActive === false) {
    throw new HttpError(403, "Энэ бүртгэл идэвхгүй эсвэл хориглогдсон байна.", "ACCOUNT_DISABLED");
  }
  if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
    throw new HttpError(423, "Түр түгжигдсэн. Дахин оролдоно уу.", "LOCKED");
  }
}

function publicTeamUser(row) {
  if (!row) return null;
  if (typeof row !== "object") return row;
  return {
    _id: row._id || row.id,
    username: row.username,
    avatar: row.avatar || null,
    role: row.role,
  };
}

function toClientTeam(team, actorId) {
  if (!team) return team;
  const members = (team.members || []).map((m) => ({
    user: publicTeamUser(m.user),
    role: m.role,
    addedBy: m.addedBy || m.added_by || null,
    addedAt: m.addedAt || m.added_at || null,
  }));
  const myRole =
    members.find((m) => String(m.user?._id || m.user) === String(actorId))?.role || null;
  return {
    _id: team._id,
    name: team.name,
    description: team.description,
    createdBy: publicTeamUser(team.createdBy) || team.createdBy,
    members,
    membersCount: team.membersCount ?? members.length,
    myRole,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

function parseTeamCreateBody(body, { requireTerms, requireDescription } = {}) {
  const name = String(body?.name || "").trim();
  const description = String(body?.description || "").trim();
  const acceptTerms = body?.acceptTerms === true || body?.acceptTerms === "true";
  const fields = {};
  if (charLen(name) < NAME_MIN || charLen(name) > NAME_MAX) {
    fields.name = `Багийн нэр ${NAME_MIN}–${NAME_MAX} тэмдэгт байна.`;
  }
  if (requireDescription) {
    if (charLen(description) < DESCRIPTION_MIN || charLen(description) > DESCRIPTION_MAX) {
      fields.description = `Танилцуулга ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} тэмдэгт байна.`;
    }
  } else if (description && charLen(description) > DESCRIPTION_MAX) {
    fields.description = `Танилцуулга хамгийн ихдээ ${DESCRIPTION_MAX} тэмдэгт байна.`;
  }
  if (requireTerms && !acceptTerms) {
    fields.acceptTerms = "Нийтлэх дүрмийг зөвшөөрнө үү.";
  }
  if (Object.keys(fields).length) throw new FieldError(fields);
  return { name, description, acceptTerms };
}

async function loadTeamPayload(client, teamId, actorId) {
  const teamRes = await client.query(
    `SELECT t.id, t.name, t.description, t.created_by, t.created_at, t.updated_at,
            u.username AS created_username, u.avatar AS created_avatar, u.role AS created_role
       FROM arc.teams t
       LEFT JOIN arc.users u ON u.id = t.created_by
      WHERE t.id=$1`,
    [teamId]
  );
  const row = teamRes.rows[0];
  if (!row) return null;
  const membersRes = await client.query(
    `SELECT m.user_id, m.role, m.added_by, m.added_at,
            u.username, u.avatar, u.role AS user_role
       FROM arc.team_members m
       JOIN arc.users u ON u.id = m.user_id
      WHERE m.team_id=$1
      ORDER BY m.added_at NULLS LAST, m.user_id`,
    [teamId]
  );
  return toClientTeam(
    {
      _id: row.id,
      name: row.name,
      description: row.description,
      createdBy: {
        _id: row.created_by,
        username: row.created_username,
        avatar: row.created_avatar,
        role: row.created_role,
      },
      members: membersRes.rows.map((m) => ({
        user: { _id: m.user_id, username: m.username, avatar: m.avatar, role: m.user_role },
        role: m.role,
        addedBy: m.added_by,
        addedAt: m.added_at,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    actorId
  );
}

async function countOwnedActiveTeams(client, userId) {
  const owned = await client.query(
    `SELECT COUNT(*)::int AS n
       FROM arc.team_members tm
       INNER JOIN arc.teams t ON t.id = tm.team_id
      WHERE tm.user_id=$1 AND tm.role='owner'`,
    [String(userId)]
  );
  return owned.rows[0]?.n || 0;
}

async function createTeamForUser({ user, body, idempotencyKey }) {
  assertActiveAccount(user);
  if (!canCreateTeam(user)) {
    if (String(user.role || "") === "editor" && !isSelfServeTeamCreationEnabled()) {
      throw new HttpError(403, "Шинэ баг үүсгэх түр хаагдсан.", "SELF_SERVE_TEAM_CREATION_DISABLED");
    }
    throw new HttpError(403, "Баг үүсгэхийн тулд editor эрх хэрэгтэй.", "TEAM_CREATE_FORBIDDEN");
  }

  const admin = isSiteAdmin(user);
  const parsed = parseTeamCreateBody(body, {
    requireTerms: !admin,
    requireDescription: !admin,
  });
  const userId = userIdOf(user);
  const key = String(idempotencyKey || "").trim().slice(0, 180) || null;

  if (!isPostgres()) {
    const team = await Team.create({
      name: parsed.name,
      description: parsed.description || "",
      createdBy: userId,
      members: [{ user: userId, role: "owner", addedBy: userId }],
    });
    return { team: toClientTeam(team.toObject ? team.toObject() : team, userId), replayed: false };
  }

  const extra = {
    idempotencyKey: key || undefined,
    termsVersion: parsed.acceptTerms ? TERMS_VERSION : undefined,
    termsAcceptedAt: parsed.acceptTerms ? new Date().toISOString() : undefined,
    source: admin ? "admin" : "self-serve",
    pgitest: Boolean(user.extra?.pgitest),
  };

  try {
    return await withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`team-create:${userId}`]);
      const person = await client.query(
        `SELECT id, role, blocked, is_active, lock_until FROM arc.users WHERE id=$1 FOR UPDATE`,
        [userId]
      );
      const row = person.rows[0];
      if (!row || row.blocked || row.is_active === false) {
        throw new HttpError(403, "Энэ бүртгэл идэвхгүй эсвэл хориглогдсон байна.", "ACCOUNT_DISABLED");
      }
      if (row.lock_until && new Date(row.lock_until).getTime() > Date.now()) {
        throw new HttpError(423, "Түр түгжигдсан. Дахин оролдоно уу.", "LOCKED");
      }
      if (key) {
        const existing = await client.query(
          `SELECT id FROM arc.teams WHERE created_by=$1 AND extra->>'idempotencyKey'=$2 LIMIT 1`,
          [userId, key]
        );
        if (existing.rowCount) {
          return { team: await loadTeamPayload(client, existing.rows[0].id, userId), replayed: true };
        }
      }
      const owned = await countOwnedActiveTeams(client, userId);
      if (activeOwnerLimitReached(owned, admin)) {
        throw new HttpError(
          403,
          `Идэвхтэй багийн тоо хүрлээ (${ACTIVE_TEAM_LIMIT}). Хуучин багууд хаагдахгүй.`,
          "SELF_SERVE_TEAM_LIMIT"
        );
      }
      const id = newId();
      await client.query(
        `INSERT INTO arc.teams (id, name, description, created_by, extra, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,now(),now())`,
        [id, parsed.name, parsed.description || "", userId, JSON.stringify(extra)]
      );
      await client.query(
        `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
         VALUES ($1,$2,'owner',$2,now())`,
        [id, userId]
      );
      if (process.env.PGITEST_TEAM_CREATE_FAIL && process.env.PGITEST_TEAM_CREATE_FAIL === userId) {
        throw new Error("pgitest forced rollback");
      }
      return { team: await loadTeamPayload(client, id, userId), replayed: false };
    });
  } catch (err) {
    if (err.code === "23505" && key) {
      const existing = await query(
        `SELECT id FROM arc.teams WHERE created_by=$1 AND extra->>'idempotencyKey'=$2 LIMIT 1`,
        [userId, key]
      );
      if (existing.rowCount) {
        const team = await loadTeamPayload({ query }, existing.rows[0].id, userId);
        return { team, replayed: true };
      }
    }
    throw err;
  }
}

module.exports = {
  FieldError,
  HttpError,
  charLen,
  parseTeamCreateBody,
  toClientTeam,
  publicTeamUser,
  createTeamForUser,
  countOwnedActiveTeams,
  canCreateTeam,
};
