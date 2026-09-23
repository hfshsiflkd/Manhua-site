"use strict";

const { TERMS_VERSION } = require("./selfServeEditor");

const NAME_MIN = 2;
const NAME_MAX = 60;
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 1000;
const ACTIVE_TEAM_LIMIT = Number(process.env.SELF_SERVE_TEAM_ACTIVE_LIMIT || 2);
const CREATE_MAX = Number(process.env.SELF_SERVE_TEAM_CREATE_MAX || 5);
const CREATE_WINDOW_MS = Number(process.env.SELF_SERVE_TEAM_CREATE_WINDOW_MS || 60 * 60 * 1000);

/** Default on. `false`/`0`/`off`/`no` blocks new self-serve creates only. Admin create stays. */
function isSelfServeTeamCreationEnabled() {
  const raw = process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
  if (raw == null || String(raw).trim() === "") return true;
  return !["0", "false", "off", "no"].includes(String(raw).trim().toLowerCase());
}

function canCreateTeam(user) {
  const role = String(user?.role || "").toLowerCase();
  if (role === "admin") return true;
  if (role === "editor") return isSelfServeTeamCreationEnabled();
  return false;
}

function activeOwnerLimitReached(ownedCount, isAdmin) {
  if (isAdmin) return false;
  return Number(ownedCount) >= ACTIVE_TEAM_LIMIT;
}

module.exports = {
  TERMS_VERSION,
  NAME_MIN,
  NAME_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  ACTIVE_TEAM_LIMIT,
  CREATE_MAX,
  CREATE_WINDOW_MS,
  isSelfServeTeamCreationEnabled,
  canCreateTeam,
  activeOwnerLimitReached,
};
