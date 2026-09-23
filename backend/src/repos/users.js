"use strict";

const bcrypt = require("bcryptjs");
const { query } = require("../db/postgres");

function toApiUser(row, { includePassword = false } = {}) {
  if (!row) return null;
  const user = {
    _id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    sessionToken: row.session_token,
    tokenVersion: row.token_version,
    hasUsedTrial: row.has_used_trial,
    trialGrantedAt: row.trial_granted_at,
    deviceId: row.device_id,
    lastRegisterIP: row.last_register_ip,
    lastDeviceId: row.last_device_id,
    deviceSwitchWindowStart: row.device_switch_window_start,
    deviceSwitchCount: row.device_switch_count,
    deviceSwitchFirstAt: row.device_switch_first_at,
    lockUntil: row.lock_until,
    lockReason: row.lock_reason,
    role: row.role,
    isActive: row.is_active,
    blocked: row.blocked,
    isVIP: row.is_vip,
    vipExpiresAt: row.vip_expires_at,
    vipLevel: row.vip_level,
    avatar: row.avatar,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    extra: row.extra,
    isLocked: row.lock_until ? new Date(row.lock_until).getTime() > Date.now() : false,
  };
  if (includePassword) user.password = row.password_hash;
  return user;
}

async function findByEmailOrUsername(identifier, { withPassword = false } = {}) {
  const ident = String(identifier || "").trim();
  const email = ident.includes("@") ? ident.toLowerCase() : ident;
  const r = await query(
    `SELECT * FROM arc.users WHERE email = $1 OR username = $2 LIMIT 1`,
    [email, ident]
  );
  return toApiUser(r.rows[0], { includePassword: withPassword });
}

async function findById(id) {
  const r = await query(`SELECT * FROM arc.users WHERE id = $1`, [id]);
  return toApiUser(r.rows[0]);
}

async function matchPassword(user, plaintext) {
  if (!user?.password) return false;
  return bcrypt.compare(plaintext, user.password);
}

async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, 10);
}

module.exports = {
  findByEmailOrUsername,
  findById,
  matchPassword,
  hashPassword,
  toApiUser,
};
