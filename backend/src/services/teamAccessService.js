"use strict";

const { isPostgres } = require("../store/driver");
const { query } = require("../db/postgres");

const STAFF_ROLES = new Set(["admin", "editor", "translator"]);
const TEAM_EDIT_ROLES = new Set(["owner", "admin", "editor"]);

function isStaffRole(role) {
  return STAFF_ROLES.has(String(role || "").toLowerCase());
}

function isPublisherRole(role) {
  return isStaffRole(role);
}

function isTeamAdminRole(role) {
  return role === "owner" || role === "admin";
}

function memberUserId(member) {
  const u = member?.user;
  if (!u) return "";
  if (typeof u === "string") return String(u);
  return String(u._id || u.id || "");
}

async function hasTeamMembership(userId) {
  if (!userId || !isPostgres()) return false;
  const r = await query(`SELECT 1 FROM arc.team_members WHERE user_id=$1 LIMIT 1`, [String(userId)]);
  return r.rowCount > 0;
}

async function getMemberRole(teamId, userId) {
  if (!teamId || !userId || !isPostgres()) return null;
  const r = await query(
    `SELECT role FROM arc.team_members WHERE team_id=$1 AND user_id=$2 LIMIT 1`,
    [String(teamId), String(userId)]
  );
  return r.rows[0]?.role || null;
}

async function canAccessEditorWorkspace(user) {
  if (!user) return false;
  if (isStaffRole(user.role)) return true;
  return hasTeamMembership(user._id || user.id);
}

async function resolveManhuaId({ manhuaId, slug } = {}) {
  if (manhuaId) return String(manhuaId);
  if (!slug || !isPostgres()) return null;
  const r = await query(`SELECT id FROM arc.manhuas WHERE slug=$1 LIMIT 1`, [String(slug)]);
  return r.rows[0]?.id || null;
}

async function canUploadForManhua(user, { manhuaId, slug } = {}) {
  if (!user) return false;
  if (isStaffRole(user.role)) return true;
  const userId = String(user._id || user.id || "");
  if (!userId || !isPostgres()) return false;
  const id = manhuaId ? String(manhuaId) : await resolveManhuaId({ slug });
  if (!id) return false;
  const r = await query(
    `SELECT m.id, m.team_id, m.created_by,
            EXISTS (SELECT 1 FROM arc.manhua_owners o WHERE o.manhua_id=m.id AND o.user_id=$2) AS is_listed_owner
       FROM arc.manhuas m
      WHERE m.id=$1
      LIMIT 1`,
    [id, userId]
  );
  const row = r.rows[0];
  if (!row) return false;
  if (String(row.created_by) === userId || row.is_listed_owner) return true;
  if (!row.team_id) return false;
  const role = await getMemberRole(row.team_id, userId);
  return TEAM_EDIT_ROLES.has(String(role || ""));
}

async function lockTeamJoin(client, teamId, userId) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
    `team-join:${String(teamId)}:${String(userId)}`,
  ]);
}

async function addTeamEditorMember(client, { teamId, userId, addedBy }) {
  await client.query(
    `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
     VALUES ($1,$2,'editor',$3,now())
     ON CONFLICT (team_id, user_id) DO NOTHING`,
    [String(teamId), String(userId), addedBy ? String(addedBy) : null]
  );
  await client.query(
    `UPDATE arc.team_invites
     SET status='accepted', responded_at=now(), updated_at=now()
     WHERE team_id=$1 AND invited_user_id=$2 AND status='pending'`,
    [String(teamId), String(userId)]
  );
}

module.exports = {
  STAFF_ROLES,
  isStaffRole,
  isPublisherRole,
  isTeamAdminRole,
  memberUserId,
  hasTeamMembership,
  getMemberRole,
  canAccessEditorWorkspace,
  resolveManhuaId,
  canUploadForManhua,
  lockTeamJoin,
  addTeamEditorMember,
};
