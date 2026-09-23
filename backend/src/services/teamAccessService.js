"use strict";

const { isPostgres } = require("../store/driver");
const { query } = require("../db/postgres");

const STAFF_ROLES = new Set(["admin", "editor", "translator"]);

function isStaffRole(role) {
  return STAFF_ROLES.has(String(role || "").toLowerCase());
}

function isPublisherRole(role) {
  return isStaffRole(role);
}

function isTeamAdminRole(role) {
  return role === "owner" || role === "admin";
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
  hasTeamMembership,
  getMemberRole,
  canAccessEditorWorkspace,
  addTeamEditorMember,
};
