"use strict";

const { query, asId, newId, wrapPg, withTransaction } = require("./helpers");

function toMap(obj) {
  return new Map(Object.entries(obj || {}));
}

function rowToRequest(row) {
  if (!row) return null;
  const monthlyVotes = toMap(row.monthly_votes);
  const votersByMonth = new Map(
    Object.entries(row.voters_by_month || {}).map(([k, v]) => [k, Array.isArray(v) ? v : []])
  );
  const doc = {
    _id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    createdBy: row.created_by,
    votes: Number(row.votes || 0),
    monthlyVotes,
    votersByMonth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  doc.toObject = () => ({
    _id: doc._id,
    title: doc.title,
    imageUrl: doc.imageUrl,
    createdBy: doc.createdBy,
    votes: doc.votes,
    monthlyVotes: Object.fromEntries(doc.monthlyVotes),
    votersByMonth: Object.fromEntries(doc.votersByMonth),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
  doc.save = async function save() {
    await withTransaction(async (client) => {
      const id = asId(doc._id);
      await client.query(`SELECT id FROM arc.requests WHERE id=$1 FOR UPDATE`, [id]);
      const existing = await client.query(
        `SELECT month_key, voter_key FROM arc.request_voters WHERE request_id=$1`,
        [id]
      );
      const merged = new Map();
      for (const row of existing.rows) {
        merged.set(`${row.month_key}\0${row.voter_key}`, { monthKey: row.month_key, voter: row.voter_key });
      }
      for (const [monthKey, voters] of doc.votersByMonth.entries()) {
        for (const voter of voters || []) {
          merged.set(`${monthKey}\0${voter}`, { monthKey, voter: String(voter) });
        }
      }
      const byMonth = new Map();
      for (const { monthKey, voter } of merged.values()) {
        if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
        byMonth.get(monthKey).push(voter);
      }
      let total = 0;
      for (const voters of byMonth.values()) total += voters.length;
      await client.query(
        `UPDATE arc.requests SET title=$2, image_url=$3, votes=$4, updated_at=now() WHERE id=$1`,
        [id, doc.title, doc.imageUrl || "", total]
      );
      await client.query("DELETE FROM arc.request_monthly_votes WHERE request_id=$1", [id]);
      await client.query("DELETE FROM arc.request_voters WHERE request_id=$1", [id]);
      for (const [monthKey, voters] of byMonth.entries()) {
        await client.query(
          `INSERT INTO arc.request_monthly_votes (request_id, month_key, votes) VALUES ($1,$2,$3)`,
          [id, monthKey, voters.length]
        );
        for (const voter of voters) {
          await client.query(
            `INSERT INTO arc.request_voters (request_id, month_key, voter_key) VALUES ($1,$2,$3)
             ON CONFLICT DO NOTHING`,
            [id, monthKey, voter]
          );
        }
      }
      doc.votes = total;
      doc.monthlyVotes = new Map([...byMonth.entries()].map(([k, v]) => [k, v.length]));
      doc.votersByMonth = byMonth;
    });
    return doc;
  };
  return doc;
}

async function loadRequest(id) {
  const r = await query(`SELECT * FROM arc.requests WHERE id=$1`, [id]);
  if (!r.rows[0]) return null;
  const votes = await query(
    `SELECT month_key, votes FROM arc.request_monthly_votes WHERE request_id=$1`,
    [id]
  );
  const voters = await query(
    `SELECT month_key, voter_key FROM arc.request_voters WHERE request_id=$1`,
    [id]
  );
  const monthly = {};
  for (const row of votes.rows) monthly[row.month_key] = row.votes;
  const votersByMonth = {};
  for (const row of voters.rows) {
    votersByMonth[row.month_key] = votersByMonth[row.month_key] || [];
    votersByMonth[row.month_key].push(row.voter_key);
  }
  return rowToRequest({ ...r.rows[0], monthly_votes: monthly, voters_by_month: votersByMonth });
}

class RequestQuery {
  constructor(filter = {}, { one = false } = {}) {
    this.filter = filter;
    this.one = one;
    this._lean = false;
  }
  sort() {
    return this;
  }
  lean() {
    this._lean = true;
    return this;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  async exec() {
    const params = [];
    let sql = "SELECT id FROM arc.requests";
    if (this.filter._id) {
      params.push(asId(this.filter._id));
      sql += ` WHERE id=$${params.length}`;
    }
    sql += " ORDER BY created_at DESC";
    if (this.one) sql += " LIMIT 1";
    const r = await query(sql, params);
    const rows = [];
    for (const row of r.rows) {
      const doc = await loadRequest(row.id);
      if (!doc) continue;
      rows.push(this._lean ? doc.toObject() : doc);
    }
    return this.one ? rows[0] || null : rows;
  }
}

const Request = {
  find(filter) {
    return new RequestQuery(filter);
  },
  findById(id) {
    return new RequestQuery({ _id: id }, { one: true });
  },
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.requests (id, title, image_url, created_by, votes, extra, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,now(),now())`,
      [id, input.title, input.imageUrl || "", input.createdBy ? asId(input.createdBy) : null, Number(input.votes || 0)]
    );
    const doc = await loadRequest(id);
    if (input.monthlyVotes) {
      const map = input.monthlyVotes instanceof Map ? input.monthlyVotes : new Map(Object.entries(input.monthlyVotes));
      doc.monthlyVotes = map;
    }
    if (input.votersByMonth) {
      const map = input.votersByMonth instanceof Map ? input.votersByMonth : new Map(Object.entries(input.votersByMonth));
      doc.votersByMonth = map;
    }
    await doc.save();
    return loadRequest(id);
  },
};

function rowToFeedback(row) {
  if (!row) return null;
  return {
    _id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class FeedbackQuery {
  constructor(filter = {}, { one = false } = {}) {
    this.filter = filter;
    this.one = one;
    this._skip = 0;
    this._limit = null;
    this._lean = false;
  }
  sort() {
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
  lean() {
    this._lean = true;
    return this;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  async exec() {
    const params = [];
    const clauses = [];
    if (this.filter._id) {
      params.push(asId(this.filter._id));
      clauses.push(`id=$${params.length}`);
    }
    if (this.filter.type) {
      params.push(this.filter.type);
      clauses.push(`type=$${params.length}`);
    }
    if (this.filter.status) {
      params.push(this.filter.status);
      clauses.push(`status=$${params.length}`);
    }
    let sql = `SELECT * FROM arc.feedback WHERE ${clauses.length ? clauses.join(" AND ") : "true"} ORDER BY created_at DESC`;
    if (this._limit != null) {
      params.push(this._limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (this._skip) {
      params.push(this._skip);
      sql += ` OFFSET $${params.length}`;
    }
    const r = await query(sql, params);
    const rows = r.rows.map(rowToFeedback);
    return this.one ? rows[0] || null : rows;
  }
}

const Feedback = {
  find(filter) {
    return new FeedbackQuery(filter);
  },
  findById(id) {
    return new FeedbackQuery({ _id: id }, { one: true });
  },
  countDocuments(filter) {
    return new FeedbackQuery(filter).exec().then((rows) => rows.length);
  },
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.feedback (id, type, name, description, image_url, status, extra, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,now(),now())`,
      [id, input.type, input.name, input.description, input.imageUrl || "", input.status || "new"]
    );
    return Feedback.findById(id);
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    const set = update.$set || update;
    const current = await Feedback.findById(id);
    if (!current) return null;
    Object.assign(current, set);
    await query(
      `UPDATE arc.feedback SET type=$2, name=$3, description=$4, image_url=$5, status=$6, updated_at=now() WHERE id=$1`,
      [asId(id), current.type, current.name, current.description, current.imageUrl || "", current.status]
    );
    return opts.new === false ? current : Feedback.findById(id);
  },
};

module.exports = { Request, Feedback };
