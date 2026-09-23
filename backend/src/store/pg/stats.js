"use strict";

const { query, asId, asIdList, newId, wrapPg } = require("./helpers");

const ChapterReadMonth = {
  async create(input) {
    const id = newId();
    try {
      await query(
        `INSERT INTO arc.chapter_read_months (
          id, chapter_id, viewer_key, month_key, first_read_at, expire_at, extra, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,now(),now())`,
        [
          id,
          asId(input.chapterId),
          input.viewerKey,
          input.monthKey,
          input.firstReadAt || new Date(),
          input.expireAt,
        ]
      );
    } catch (err) {
      wrapPg(err);
    }
    return { _id: id, ...input };
  },
};

const ChapterRead = {
  async create(input) {
    const id = newId();
    try {
      await query(
        `INSERT INTO arc.chapter_reads (id, chapter_id, viewer_key, first_read_at, extra, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'{}'::jsonb,now(),now())`,
        [id, asId(input.chapterId), input.viewerKey, input.firstReadAt || new Date()]
      );
    } catch (err) {
      wrapPg(err);
    }
    return { _id: id, ...input };
  },
};

const EditorMonthStat = {
  find(filter = {}) {
    const q = {
      select() {
        return q;
      },
      lean() {
        return q.exec();
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const params = [];
        const clauses = [];
        if (filter.monthKey) {
          params.push(filter.monthKey);
          clauses.push(`month_key=$${params.length}`);
        }
        if (filter.editorId?.$in) {
          params.push(asIdList(filter.editorId.$in));
          clauses.push(`editor_id = ANY($${params.length})`);
        } else if (filter.editorId) {
          params.push(asId(filter.editorId));
          clauses.push(`editor_id=$${params.length}`);
        }
        const r = await query(
          `SELECT * FROM arc.editor_month_stats WHERE ${clauses.length ? clauses.join(" AND ") : "true"}`,
          params
        );
        return r.rows.map((row) => ({
          _id: row.id,
          monthKey: row.month_key,
          editorId: row.editor_id,
          chapterMonthlyViews: Number(row.chapter_monthly_views || 0),
          chaptersUploaded: Number(row.chapters_uploaded || 0),
        }));
      },
    };
    return q;
  },
  findOne(filter) {
    const q = EditorMonthStat.find(filter);
    const orig = q.exec.bind(q);
    q.exec = async () => (await orig())[0] || null;
    return q;
  },
  async updateOne(filter, update, opts = {}) {
    const inc = Number(update?.$inc?.chapterMonthlyViews || 0);
    const uploaded = Number(update?.$inc?.chaptersUploaded || 0);
    if (opts.upsert) {
      await query(
        `INSERT INTO arc.editor_month_stats (
          id, month_key, editor_id, chapter_monthly_views, chapters_uploaded, extra, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,now(),now())
         ON CONFLICT (month_key, editor_id) DO UPDATE SET
          chapter_monthly_views = arc.editor_month_stats.chapter_monthly_views + EXCLUDED.chapter_monthly_views,
          chapters_uploaded = arc.editor_month_stats.chapters_uploaded + EXCLUDED.chapters_uploaded,
          updated_at = now()`,
        [newId(), filter.monthKey, asId(filter.editorId), inc, uploaded]
      );
    }
    return { acknowledged: true };
  },
};

const EditorManhuaMonthStat = {
  find(filter = {}) {
    const q = {
      select() {
        return q;
      },
      lean() {
        return q.exec();
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const params = [];
        const clauses = [];
        if (filter.monthKey) {
          params.push(filter.monthKey);
          clauses.push(`month_key=$${params.length}`);
        }
        if (filter.editorId?.$in) {
          params.push(asIdList(filter.editorId.$in));
          clauses.push(`editor_id = ANY($${params.length})`);
        }
        const r = await query(
          `SELECT * FROM arc.editor_manhua_month_stats WHERE ${clauses.length ? clauses.join(" AND ") : "true"}`,
          params
        );
        return r.rows.map((row) => ({
          _id: row.id,
          monthKey: row.month_key,
          editorId: row.editor_id,
          manhuaId: row.manhua_id,
          monthlyViews: Number(row.monthly_views || 0),
        }));
      },
    };
    return q;
  },
  async updateOne(filter, update, opts = {}) {
    const inc = Number(update?.$inc?.monthlyViews || 0);
    if (opts.upsert) {
      await query(
        `INSERT INTO arc.editor_manhua_month_stats (
          id, month_key, editor_id, manhua_id, monthly_views, extra, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,now(),now())
         ON CONFLICT (month_key, editor_id, manhua_id) DO UPDATE SET
          monthly_views = arc.editor_manhua_month_stats.monthly_views + EXCLUDED.monthly_views,
          updated_at = now()`,
        [newId(), filter.monthKey, asId(filter.editorId), asId(filter.manhuaId), inc]
      );
    }
    return { acknowledged: true };
  },
};

async function loadFinance(id) {
  const r = await query(`SELECT * FROM arc.finance_months WHERE id=$1`, [id]);
  if (!r.rows[0]) return null;
  const events = await query(
    `SELECT * FROM arc.finance_revenue_events WHERE finance_month_id=$1 ORDER BY position`,
    [id]
  );
  return {
    _id: r.rows[0].id,
    monthKey: r.rows[0].month_key,
    totalRevenue: Number(r.rows[0].total_revenue || 0),
    currency: r.rows[0].currency,
    revenueEvents: events.rows.map((row) => ({
      userId: row.user_id,
      adminId: row.admin_id,
      amount: Number(row.amount || 0),
      currency: row.currency,
      paidAt: row.paid_at,
      monthsGranted: Number(row.months_granted || 0),
      note: row.note,
    })),
    createdAt: r.rows[0].created_at,
    updatedAt: r.rows[0].updated_at,
  };
}

const FinanceMonth = {
  findOne(filter = {}) {
    const q = {
      lean() {
        return q.exec();
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const r = await query(`SELECT id FROM arc.finance_months WHERE month_key=$1 LIMIT 1`, [
          filter.monthKey,
        ]);
        if (!r.rows[0]) return null;
        return loadFinance(r.rows[0].id);
      },
    };
    return q;
  },
  findOneAndUpdate(filter, update, opts = {}) {
    const q = {
      lean() {
        return q;
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        let current = await FinanceMonth.findOne(filter);
        if (!current && opts.upsert) {
          const id = newId();
          await query(
            `INSERT INTO arc.finance_months (id, month_key, total_revenue, currency, extra, created_at, updated_at)
             VALUES ($1,$2,$3,$4,'{}'::jsonb,now(),now())`,
            [id, filter.monthKey, 0, update.$setOnInsert?.currency || "MNT"]
          );
          current = await loadFinance(id);
        }
        if (!current) return null;
        if (update.$inc?.totalRevenue) {
          await query(
            `UPDATE arc.finance_months SET total_revenue = total_revenue + $2, updated_at=now() WHERE id=$1`,
            [current._id, Number(update.$inc.totalRevenue)]
          );
        }
        const pushed = update.$push?.revenueEvents;
        if (pushed) {
          const pos = (current.revenueEvents || []).length;
          await query(
            `INSERT INTO arc.finance_revenue_events (
              finance_month_id, position, user_id, admin_id, amount, currency, paid_at, months_granted, note
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              current._id,
              pos,
              pushed.userId ? asId(pushed.userId) : null,
              pushed.adminId ? asId(pushed.adminId) : null,
              Number(pushed.amount || 0),
              pushed.currency || "MNT",
              pushed.paidAt || new Date(),
              Number(pushed.monthsGranted || 0),
              pushed.note || "",
            ]
          );
        }
        return opts.new ? loadFinance(current._id) : current;
      },
    };
    return q;
  },
  async aggregate(pipeline = []) {
    const match = pipeline[0]?.$match || {};
    const params = [];
    let where = "e.user_id IS NOT NULL AND u.role = 'user'";
    if (match.monthKey) {
      params.push(match.monthKey);
      where += ` AND f.month_key = $${params.length}`;
    }
    const lastLimit = [...pipeline].reverse().find((s) => s.$limit)?.$limit || 20;
    const r = await query(
      `SELECT e.user_id AS "userId", u.username, SUM(e.amount)::float AS "totalSpent"
       FROM arc.finance_revenue_events e
       JOIN arc.finance_months f ON f.id = e.finance_month_id
       JOIN arc.users u ON u.id = e.user_id
       WHERE ${where}
       GROUP BY e.user_id, u.username
       ORDER BY SUM(e.amount) DESC
       LIMIT ${Number(lastLimit)}`,
      params
    );
    return r.rows;
  },
};

const VipPlan = {
  find(filter = {}) {
    const q = {
      _sort: null,
      sort(spec) {
        q._sort = spec;
        return q;
      },
      lean() {
        return q.exec();
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const params = [];
        const clauses = [];
        if (filter.active != null) {
          params.push(Boolean(filter.active));
          clauses.push(`active=$${params.length}`);
        }
        let sql = `SELECT * FROM arc.vip_plans WHERE ${clauses.length ? clauses.join(" AND ") : "true"}`;
        sql += " ORDER BY display_order ASC, months ASC";
        const r = await query(sql, params);
        return r.rows.map((row) => ({
          _id: row.id,
          months: Number(row.months),
          priceTotal: Number(row.price_total),
          active: row.active,
          displayOrder: Number(row.display_order || 0),
        }));
      },
    };
    return q;
  },
  findOne(filter) {
    const q = {
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const r = await query(`SELECT * FROM arc.vip_plans WHERE months=$1 LIMIT 1`, [filter.months]);
        if (!r.rows[0]) return null;
        const doc = {
          _id: r.rows[0].id,
          months: Number(r.rows[0].months),
          priceTotal: Number(r.rows[0].price_total),
          active: r.rows[0].active,
          displayOrder: Number(r.rows[0].display_order || 0),
        };
        doc.save = async function save() {
          await query(
            `UPDATE arc.vip_plans SET price_total=$2, display_order=$3, active=$4, updated_at=now() WHERE id=$1`,
            [doc._id, doc.priceTotal, Number(doc.displayOrder || 0), doc.active !== false]
          );
          return doc;
        };
        return doc;
      },
    };
    return q;
  },
  findById(id) {
    const q = {
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const r = await query(`SELECT * FROM arc.vip_plans WHERE id=$1`, [asId(id)]);
        return r.rows[0]
          ? {
              _id: r.rows[0].id,
              months: Number(r.rows[0].months),
              priceTotal: Number(r.rows[0].price_total),
              active: r.rows[0].active,
            }
          : null;
      },
    };
    return q;
  },
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.vip_plans (id, months, price_total, active, display_order, extra, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,now(),now())`,
      [id, input.months, input.priceTotal, input.active !== false, Number(input.displayOrder || 0)]
    );
    return VipPlan.findById(id);
  },
};

const RegisterAttempt = {
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.register_attempts (id, ip, extra, created_at, updated_at)
       VALUES ($1,$2,'{}'::jsonb,now(),now())`,
      [id, input.ip || null]
    );
    return { _id: id, ip: input.ip };
  },
};

module.exports = {
  ChapterRead,
  ChapterReadMonth,
  EditorMonthStat,
  EditorManhuaMonthStat,
  FinanceMonth,
  VipPlan,
  RegisterAttempt,
};
