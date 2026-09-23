"use strict";

const { query, asId, newId } = require("./helpers");

function rowToAudit(row) {
  if (!row) return null;
  return {
    _id: row.id,
    ts: row.ts,
    level: row.level,
    category: row.category,
    action: row.action,
    message: row.message,
    user: {
      id: row.user_id,
      username: row.username_snapshot,
      role: row.role_snapshot,
    },
    ip: row.ip,
    deviceIdHash: row.device_id_hash,
    method: row.method,
    path: row.path,
    statusCode: row.status_code,
    durationMs: row.duration_ms,
    requestId: row.request_id,
    meta: row.meta || {},
  };
}

const AuditLog = {
  async create(input) {
    const id = newId();
    const entry = input.level
      ? input
      : {
          ts: new Date(),
          level: "INFO",
          category: "admin",
          action: input.action || "unknown",
          message: input.action || "audit",
          user: input.user,
          ip: input.ip,
          meta: {
            adminId: input.adminId,
            targetUserId: input.targetUserId,
            changes: input.changes,
            userAgent: input.userAgent,
          },
        };
    await query(
      `INSERT INTO arc.audit_logs (
        id, ts, level, category, action, message, user_id, username_snapshot, role_snapshot,
        ip, device_id_hash, method, path, status_code, duration_ms, request_id, meta, extra
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,'{}'::jsonb
      )`,
      [
        id,
        entry.ts || new Date(),
        entry.level,
        entry.category,
        entry.action,
        entry.message,
        entry.user?.id ? asId(entry.user.id) : null,
        entry.user?.username || null,
        entry.user?.role || null,
        entry.ip || null,
        entry.deviceIdHash || null,
        entry.method || null,
        entry.path || null,
        entry.statusCode ?? null,
        entry.durationMs ?? null,
        entry.requestId || null,
        JSON.stringify(entry.meta || {}),
      ]
    );
    return { _id: id, ...input };
  },
  find(filter = {}) {
    const q = {
      _skip: 0,
      _limit: null,
      _sort: { ts: -1 },
      sort(spec) {
        q._sort = spec;
        return q;
      },
      skip(n) {
        q._skip = Number(n) || 0;
        return q;
      },
      limit(n) {
        q._limit = n;
        return q;
      },
      lean() {
        return q.exec();
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const { sql, params } = compileAudit(filter);
        let text = `SELECT * FROM arc.audit_logs WHERE ${sql} ORDER BY ts DESC`;
        if (q._limit != null) {
          params.push(q._limit);
          text += ` LIMIT $${params.length}`;
        }
        if (q._skip) {
          params.push(q._skip);
          text += ` OFFSET $${params.length}`;
        }
        const r = await query(text, params);
        return r.rows.map(rowToAudit);
      },
    };
    return q;
  },
  findById(id) {
    const q = {
      lean() {
        return q.exec();
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const r = await query(`SELECT * FROM arc.audit_logs WHERE id=$1`, [asId(id)]);
        return rowToAudit(r.rows[0]);
      },
    };
    return q;
  },
  async countDocuments(filter) {
    const { sql, params } = compileAudit(filter || {});
    const r = await query(`SELECT count(*)::int AS n FROM arc.audit_logs WHERE ${sql}`, params);
    return r.rows[0].n;
  },
  async deleteMany(filter) {
    if (filter?.ts?.$lt) {
      const r = await query(`DELETE FROM arc.audit_logs WHERE ts < $1`, [filter.ts.$lt]);
      return { deletedCount: r.rowCount };
    }
    return { deletedCount: 0 };
  },
};

function compileAudit(filter) {
  const params = [];
  const clauses = [];
  if (filter.level) {
    params.push(filter.level);
    clauses.push(`level=$${params.length}`);
  }
  if (filter.category) {
    params.push(filter.category);
    clauses.push(`category=$${params.length}`);
  }
  if (filter.action) {
    params.push(filter.action);
    clauses.push(`action=$${params.length}`);
  }
  if (filter["user.id"]) {
    params.push(asId(filter["user.id"]));
    clauses.push(`user_id=$${params.length}`);
  }
  if (filter.ts?.$gte) {
    params.push(filter.ts.$gte);
    clauses.push(`ts >= $${params.length}`);
  }
  if (filter.ts?.$lte) {
    params.push(filter.ts.$lte);
    clauses.push(`ts <= $${params.length}`);
  }
  return { sql: clauses.length ? clauses.join(" AND ") : "true", params };
}

const ActionLog = {
  find(filter = {}) {
    const q = {
      _skip: 0,
      _limit: 50,
      sort() {
        return q;
      },
      skip(n) {
        q._skip = Number(n) || 0;
        return q;
      },
      limit(n) {
        q._limit = n;
        return q;
      },
      lean() {
        return q.exec();
      },
      populate() {
        return q;
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const params = [];
        const clauses = [];
        if (filter.user) {
          params.push(asId(filter.user));
          clauses.push(`user_id=$${params.length}`);
        }
        if (filter.action) {
          params.push(filter.action);
          clauses.push(`action=$${params.length}`);
        }
        params.push(q._limit, q._skip);
        const r = await query(
          `SELECT * FROM arc.action_logs WHERE ${clauses.length ? clauses.join(" AND ") : "true"}
           ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
          params
        );
        return r.rows.map((row) => ({
          _id: row.id,
          user: row.user_id,
          action: row.action,
          targetType: row.target_type,
          targetId: row.target_id,
          description: row.description,
          createdAt: row.created_at,
        }));
      },
    };
    return q;
  },
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.action_logs (id, user_id, action, target_type, target_id, description, extra, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,now(),now())`,
      [
        id,
        asId(input.user),
        input.action,
        input.targetType,
        input.targetId || null,
        input.description || null,
      ]
    );
    return { _id: id, ...input };
  },
};

module.exports = { AuditLog, ActionLog };
