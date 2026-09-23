"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  query,
  newId,
  asId,
  wrapPg,
  hashPassword,
  applyDocUpdate,
} = require("./helpers");

const SELECT = `SELECT * FROM arc.users`;

function rowToUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    password: row.password_hash,
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
    resetPasswordTokenHash: row.reset_password_token_hash,
    resetPasswordExpiresAt: row.reset_password_expires_at,
    resetPasswordRequestedAt: row.reset_password_requested_at,
    extra: row.extra || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isLocked: row.lock_until ? new Date(row.lock_until).getTime() > Date.now() : false,
  };
}

function wrap(doc) {
  if (!doc) return null;
  doc.matchPassword = async function matchPassword(entered) {
    return bcrypt.compare(entered, doc.password);
  };
  doc.createPasswordResetToken = function createPasswordResetToken() {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    doc.resetPasswordTokenHash = tokenHash;
    doc.resetPasswordExpiresAt = new Date(Date.now() + 45 * 60 * 1000);
    doc.resetPasswordRequestedAt = new Date();
    return rawToken;
  };
  doc.save = async function save() {
    const password = doc.password ? await hashPassword(doc.password) : null;
    await query(
      `UPDATE arc.users SET
        username=$2, email=$3, phone=$4, password_hash=COALESCE($5, password_hash), session_token=$6, token_version=$7,
        has_used_trial=$8, trial_granted_at=$9, device_id=$10, last_register_ip=$11, last_device_id=$12,
        device_switch_window_start=$13, device_switch_count=$14, device_switch_first_at=$15,
        lock_until=$16, lock_reason=$17, role=$18, is_active=$19, blocked=$20, is_vip=$21,
        vip_expires_at=$22, vip_level=$23, avatar=$24, reset_password_token_hash=$25,
        reset_password_expires_at=$26, reset_password_requested_at=$27, extra=$28::jsonb, updated_at=now()
       WHERE id=$1`,
      [
        String(doc._id),
        doc.username,
        String(doc.email || "").toLowerCase(),
        doc.phone || "",
        password,
        doc.sessionToken || null,
        Number(doc.tokenVersion || 0),
        Boolean(doc.hasUsedTrial),
        doc.trialGrantedAt || null,
        doc.deviceId || "",
        doc.lastRegisterIP || "",
        doc.lastDeviceId || "",
        doc.deviceSwitchWindowStart || null,
        Number(doc.deviceSwitchCount || 0),
        doc.deviceSwitchFirstAt || null,
        doc.lockUntil || null,
        doc.lockReason || "",
        doc.role || "user",
        doc.isActive !== false,
        Boolean(doc.blocked),
        Boolean(doc.isVIP),
        doc.vipExpiresAt || null,
        Number(doc.vipLevel || 0),
        doc.avatar || null,
        doc.resetPasswordTokenHash || null,
        doc.resetPasswordExpiresAt || null,
        doc.resetPasswordRequestedAt || null,
        JSON.stringify(doc.extra || {}),
      ]
    );
    return doc;
  };
  doc.toObject = () => {
    const { save, matchPassword, createPasswordResetToken, toObject, ...rest } = doc;
    return rest;
  };
  return doc;
}

class UserQuery {
  constructor(filter, { one }) {
    this.filter = filter || {};
    this.one = one;
    this._lean = false;
    this._withPassword = false;
    this._skip = 0;
    this._limit = null;
    this._sort = null;
  }
  select(spec) {
    if (spec === "+password" || (spec && spec.password === 1)) this._withPassword = true;
    return this;
  }
  lean() {
    this._lean = true;
    return this;
  }
  populate() {
    return this;
  }
  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }
  limit(n) {
    this._limit = n;
    return this;
  }
  sort(spec) {
    if (typeof spec === "string") {
      const desc = spec.startsWith("-");
      const key = desc ? spec.slice(1) : spec;
      this._sort = { [key]: desc ? -1 : 1 };
    } else {
      this._sort = spec;
    }
    return this;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  async countDocuments() {
    const { sql, params } = compileUserFilter(this.filter);
    const r = await query(`SELECT count(*)::int AS n FROM arc.users WHERE ${sql}`, params);
    return r.rows[0].n;
  }
  async exec() {
    const { sql, params } = compileUserFilter(this.filter);
    let order = "ORDER BY created_at DESC";
    if (this._sort) {
      const parts = [];
      for (const [k, dir] of Object.entries(this._sort)) {
        const col = {
          createdAt: "created_at",
          updatedAt: "updated_at",
          username: "username",
        }[k];
        if (col) parts.push(`${col} ${dir === -1 || dir === "desc" ? "DESC" : "ASC"}`);
      }
      if (parts.length) order = `ORDER BY ${parts.join(", ")}`;
    }
    let limitSql = "";
    if (this._limit != null) {
      params.push(this._limit);
      limitSql += ` LIMIT $${params.length}`;
    }
    if (this._skip) {
      params.push(this._skip);
      limitSql += ` OFFSET $${params.length}`;
    }
    const r = await query(
      `${SELECT} WHERE ${sql} ${order} ${this.one ? "LIMIT 1" : limitSql}`,
      params
    );
    const mapRow = (row) => {
      const doc = wrap(rowToUser(row));
      if (!this._withPassword) delete doc.password;
      return this._lean ? { ...doc, save: undefined, matchPassword: undefined, createPasswordResetToken: undefined, toObject: undefined } : doc;
    };
    if (this.one) {
      if (!r.rows[0]) return null;
      return mapRow(r.rows[0]);
    }
    return r.rows.map(mapRow);
  }
}

function compileUserFilter(filter) {
  const params = [];
  const clauses = [];
  if (filter.$or) {
    const emailEq = filter.$or.find((p) => typeof p.email === "string")?.email;
    const usernameEq = filter.$or.find((p) => typeof p.username === "string")?.username;
    if (emailEq || usernameEq) {
      params.push(emailEq || "", usernameEq || "");
      return { sql: "email=$1 OR username=$2", params };
    }
    const ors = [];
    for (const part of filter.$or) {
      for (const [field, val] of Object.entries(part)) {
        const col = { username: "username", email: "email", phone: "phone", lockUntil: "lock_until" }[field];
        if (!col) continue;
        if (val instanceof RegExp) {
          params.push(`%${val.source}%`);
          ors.push(`${col} ILIKE $${params.length}`);
        } else if (val?.$regex) {
          params.push(`%${val.$regex}%`);
          ors.push(`${col} ILIKE $${params.length}`);
        } else if (val === null) {
          ors.push(`${col} IS NULL`);
        } else if (val?.$lte) {
          params.push(val.$lte);
          ors.push(`${col} <= $${params.length}`);
        } else if (val?.$exists === false) {
          ors.push(`${col} IS NULL`);
        }
      }
    }
    if (ors.length) clauses.push(`(${ors.join(" OR ")})`);
  }
  if (filter.email) {
    params.push(String(filter.email).toLowerCase());
    clauses.push(`email=$${params.length}`);
  }
  if (filter.username) {
    params.push(filter.username);
    clauses.push(`username=$${params.length}`);
  }
  if (filter._id) {
    params.push(asId(filter._id));
    clauses.push(`id=$${params.length}`);
  }
  if (filter.role) {
    if (filter.role.$in) {
      params.push(filter.role.$in);
      clauses.push(`role = ANY($${params.length})`);
    } else {
      params.push(filter.role);
      clauses.push(`role=$${params.length}`);
    }
  }
  if (filter.isVIP != null) {
    params.push(Boolean(filter.isVIP));
    clauses.push(`is_vip=$${params.length}`);
  }
  if (filter.blocked != null) {
    params.push(Boolean(filter.blocked));
    clauses.push(`blocked=$${params.length}`);
  }
  if (filter.vipExpiresAt?.$gt) {
    params.push(filter.vipExpiresAt.$gt);
    clauses.push(`vip_expires_at > $${params.length}`);
  }
  if (filter.lockUntil?.$gt) {
    params.push(filter.lockUntil.$gt);
    clauses.push(`lock_until > $${params.length}`);
  }
  if (filter.resetPasswordTokenHash) {
    params.push(filter.resetPasswordTokenHash);
    clauses.push(`reset_password_token_hash=$${params.length}`);
  }
  return { sql: clauses.length ? clauses.join(" AND ") : "true", params };
}

const User = {
  collection: { name: "users" },
  find(filter) {
    return new UserQuery(filter, { one: false });
  },
  findOne(filter) {
    return new UserQuery(filter, { one: true });
  },
  findById(id) {
    return new UserQuery({ _id: id }, { one: true });
  },
  countDocuments(filter) {
    return new UserQuery(filter || {}, { one: false }).countDocuments();
  },
  async create(input) {
    const password = await hashPassword(input.password);
    const id = asId(input._id) || newId();
    try {
      await query(
        `INSERT INTO arc.users (
          id, username, email, phone, password_hash, session_token, token_version,
          has_used_trial, trial_granted_at, device_id, last_register_ip, last_device_id,
          role, is_active, blocked, is_vip, vip_expires_at, extra, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11,$12,true,false,$13,$14,$15::jsonb,now(),now()
        )`,
        [
          id,
          input.username,
          String(input.email || "").toLowerCase(),
          input.phone || "",
          password,
          input.sessionToken || null,
          Boolean(input.hasUsedTrial),
          input.trialGrantedAt || null,
          input.deviceId || "",
          input.lastRegisterIP || "",
          input.lastDeviceId || "",
          input.role || "user",
          Boolean(input.isVIP),
          input.vipExpiresAt || null,
          JSON.stringify(input.extra && typeof input.extra === "object" ? input.extra : {}),
        ]
      );
    } catch (err) {
      wrapPg(err);
    }
    return wrap(rowToUser((await query(`${SELECT} WHERE id=$1`, [id])).rows[0]));
  },
  async updateOne(filter, update) {
    const current = await User.findOne(filter);
    if (!current) return { matchedCount: 0, modifiedCount: 0 };
    applyDocUpdate(current, update);
    await current.save();
    return { matchedCount: 1, modifiedCount: 1 };
  },
  findByIdAndUpdate(id, update, opts = {}) {
    const q = {
      _lean: Boolean(opts.lean),
      lean() {
        q._lean = true;
        return q;
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const wrapped = update.$set || update.$inc || update.$unset ? update : { $set: update };
        await User.updateOne({ _id: id }, wrapped);
        const doc = await User.findById(id);
        if (!doc) return null;
        if (!q._lean) return doc;
        const { save, matchPassword, createPasswordResetToken, toObject, ...rest } = doc;
        return rest;
      },
    };
    return q;
  },
  async findOneAndUpdate(filter, update, opts = {}) {
    await User.updateOne(filter, update);
    return User.findOne(filter);
  },
};

module.exports = User;
