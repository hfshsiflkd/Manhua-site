"use strict";

const {
  query,
  asId,
  asIdList,
  newId,
  wrapPg,
  pick,
  applyDocUpdate,
  applyViewInc,
  makeSlug,
  bulkWrite,
} = require("./helpers");

function rowToManhua(row) {
  if (!row) return null;
  return {
    _id: row.id,
    title: row.title,
    titleEn: row.title_en,
    slug: row.slug,
    rating: Number(row.rating || 0),
    description: row.description,
    coverImage: row.cover_image,
    coverImageUrl: row.cover_image_url,
    ratingAverage: Number(row.rating_average || 0),
    ratingCount: Number(row.rating_count || 0),
    status: row.status,
    genres: row.genres || [],
    createdBy: row.created_by,
    owners: row.owners || [],
    team: row.team_id,
    views: Number(row.views || 0),
    weeklyViews: Number(row.weekly_views || 0),
    dailyViews: row.daily_views || {},
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE = `
  SELECT m.*,
    COALESCE((SELECT json_agg(g.genre ORDER BY g.position) FROM arc.manhua_genres g WHERE g.manhua_id = m.id), '[]'::json) AS genres,
    COALESCE((SELECT json_agg(o.user_id) FROM arc.manhua_owners o WHERE o.manhua_id = m.id), '[]'::json) AS owners,
    COALESCE((SELECT json_object_agg(d.day_key, d.views) FROM arc.manhua_daily_views d WHERE d.manhua_id = m.id), '{}'::json) AS daily_views
  FROM arc.manhuas m
`;

async function replaceGenres(id, genres) {
  await query("DELETE FROM arc.manhua_genres WHERE manhua_id=$1", [id]);
  const list = Array.isArray(genres) ? genres : [];
  for (let i = 0; i < list.length; i += 1) {
    await query(
      "INSERT INTO arc.manhua_genres (manhua_id, genre, position) VALUES ($1,$2,$3)",
      [id, String(list[i]), i]
    );
  }
}

async function replaceOwners(id, owners) {
  await query("DELETE FROM arc.manhua_owners WHERE manhua_id=$1", [id]);
  for (const owner of asIdList(owners)) {
    await query(
      "INSERT INTO arc.manhua_owners (manhua_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [id, owner]
    );
  }
}

async function replaceDailyViews(id, dailyViews) {
  await query("DELETE FROM arc.manhua_daily_views WHERE manhua_id=$1", [id]);
  const entries =
    dailyViews instanceof Map ? [...dailyViews.entries()] : Object.entries(dailyViews || {});
  for (const [day, views] of entries) {
    await query(
      "INSERT INTO arc.manhua_daily_views (manhua_id, day_key, views) VALUES ($1,$2,$3)",
      [id, String(day), Number(views) || 0]
    );
  }
}

async function saveManhua(doc) {
  await query(
    `UPDATE arc.manhuas SET
      title=$2, title_en=$3, slug=$4, rating=$5, description=$6, cover_image=$7, cover_image_url=$8,
      rating_average=$9, rating_count=$10, status=$11, created_by=$12, team_id=$13, views=$14,
      weekly_views=$15, deleted_at=$16, deleted_by=$17, extra='{}'::jsonb, updated_at=now()
     WHERE id=$1`,
    [
      asId(doc._id),
      doc.title,
      doc.titleEn || null,
      doc.slug,
      Number(doc.rating || 0),
      doc.description || null,
      doc.coverImage || null,
      doc.coverImageUrl || null,
      Number(doc.ratingAverage || 0),
      Number(doc.ratingCount || 0),
      doc.status || "ongoing",
      asId(doc.createdBy),
      doc.team ? asId(doc.team) : null,
      Number(doc.views || 0),
      Number(doc.weeklyViews || 0),
      doc.deletedAt || null,
      doc.deletedBy ? asId(doc.deletedBy) : null,
    ]
  );
  if (doc.genres) await replaceGenres(asId(doc._id), doc.genres);
  if (doc.owners) await replaceOwners(asId(doc._id), doc.owners);
  if (doc.dailyViews) await replaceDailyViews(asId(doc._id), doc.dailyViews);
  return doc;
}

function wrap(doc) {
  if (!doc) return null;
  doc.save = async function save() {
    return saveManhua(doc);
  };
  return doc;
}

class ManhuaQuery {
  constructor(filter = {}, { one = false, withDeleted = false } = {}) {
    this.filter = filter;
    this.one = one;
    this.withDeleted = withDeleted;
    this._sort = null;
    this._skip = 0;
    this._limit = null;
    this._lean = false;
    this._select = null;
    this._populate = null;
  }
  setOptions(opts) {
    if (opts?.withDeleted) this.withDeleted = true;
    return this;
  }
  sort(spec) {
    this._sort = spec;
    return this;
  }
  skip(n) {
    this._skip = n;
    return this;
  }
  limit(n) {
    this._limit = n;
    return this;
  }
  select(spec) {
    this._select = spec;
    return this;
  }
  lean() {
    this._lean = true;
    return this;
  }
  populate(spec) {
    this._populate = spec;
    return this;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  async countDocuments() {
    const { where, params } = compile(this.filter, this.withDeleted);
    const r = await query(`SELECT count(*)::int AS n FROM arc.manhuas m WHERE ${where}`, params);
    return r.rows[0].n;
  }
  async exec() {
    const { where, params } = compile(this.filter, this.withDeleted);
    let sql = `${BASE} WHERE ${where}`;
    sql += orderSql(this._sort, params);
    if (this.one) {
      sql += " LIMIT 1";
    } else {
      if (this._limit != null) {
        params.push(this._limit);
        sql += ` LIMIT $${params.length}`;
      }
      if (this._skip) {
        params.push(this._skip);
        sql += ` OFFSET $${params.length}`;
      }
    }
    const r = await query(sql, params);
    const rows = r.rows.map((row) => wrap(pick(rowToManhua(row), this._select)));
    if (this._populate && rows[0]) {
      await populateChapters(rows, this._populate);
    }
    if (this.one) return rows[0] || null;
    return rows;
  }
}

async function populateChapters(docs, spec) {
  const path = typeof spec === "string" ? spec : spec.path;
  if (path !== "chapters") return;
  const Chapter = require("./Chapter");
  const match = (typeof spec === "object" && spec.match) || {};
  const select = typeof spec === "object" ? spec.select : null;
  const sort = typeof spec === "object" ? spec.options?.sort : { chapterNumber: 1 };
  for (const doc of docs) {
    if (!doc) continue;
    const chapters = await Chapter.find({ manhua: doc._id, ...match })
      .sort(sort)
      .select(select)
      .lean();
    doc.chapters = chapters;
  }
}

function orderSql(sort, params) {
  if (!sort) return " ORDER BY m.updated_at DESC";
  const parts = [];
  for (const [k, dir] of Object.entries(sort)) {
    const desc = dir === -1 || dir === "desc";
    if (k.startsWith("dailyViews.")) {
      params.push(k.slice("dailyViews.".length));
      parts.push(
        `(SELECT views FROM arc.manhua_daily_views d WHERE d.manhua_id=m.id AND d.day_key=$${params.length}) ${desc ? "DESC" : "ASC"} NULLS LAST`
      );
      continue;
    }
    const col = {
      updatedAt: "m.updated_at",
      createdAt: "m.created_at",
      views: "m.views",
      weeklyViews: "m.weekly_views",
      rating: "m.rating",
    }[k];
    if (col) parts.push(`${col} ${desc ? "DESC" : "ASC"}`);
  }
  return parts.length ? ` ORDER BY ${parts.join(", ")}` : "";
}

function compile(filter, withDeleted) {
  const params = [];
  const clauses = [];
  if (!withDeleted && filter.deletedAt === undefined) clauses.push("m.deleted_at IS NULL");
  if (filter.deletedAt === null) clauses.push("m.deleted_at IS NULL");
  if (filter._id && typeof filter._id !== "object") {
    params.push(asId(filter._id));
    clauses.push(`m.id = $${params.length}`);
  }
  if (filter._id?.$in) {
    params.push(asIdList(filter._id.$in));
    clauses.push(`m.id = ANY($${params.length})`);
  }
  if (filter._id?.$nin) {
    params.push(asIdList(filter._id.$nin));
    clauses.push(`NOT (m.id = ANY($${params.length}))`);
  }
  if (filter.slug) {
    params.push(filter.slug);
    clauses.push(`m.slug = $${params.length}`);
  }
  if (filter.status && typeof filter.status !== "object") {
    params.push(filter.status);
    clauses.push(`m.status = $${params.length}`);
  }
  if (filter.genre) {
    params.push(filter.genre);
    clauses.push(
      `EXISTS (SELECT 1 FROM arc.manhua_genres g WHERE g.manhua_id=m.id AND g.genre=$${params.length})`
    );
  }
  if (filter.genres && typeof filter.genres === "string") {
    params.push(filter.genres);
    clauses.push(
      `EXISTS (SELECT 1 FROM arc.manhua_genres g WHERE g.manhua_id=m.id AND g.genre=$${params.length})`
    );
  }
  if (filter.createdBy?.$in) {
    params.push(asIdList(filter.createdBy.$in));
    clauses.push(`m.created_by = ANY($${params.length})`);
  } else if (filter.createdBy) {
    params.push(asId(filter.createdBy));
    clauses.push(`m.created_by = $${params.length}`);
  }
  if (filter.createdAt?.$gte) {
    params.push(filter.createdAt.$gte);
    clauses.push(`m.created_at >= $${params.length}`);
  }
  if (filter.createdAt?.$lt) {
    params.push(filter.createdAt.$lt);
    clauses.push(`m.created_at < $${params.length}`);
  }
  if (filter.owners) {
    params.push(asId(filter.owners));
    clauses.push(
      `EXISTS (SELECT 1 FROM arc.manhua_owners o WHERE o.manhua_id=m.id AND o.user_id=$${params.length})`
    );
  }
  if (filter.team === null) clauses.push("m.team_id IS NULL");
  else if (filter.team?.$in) {
    params.push(asIdList(filter.team.$in));
    clauses.push(`m.team_id = ANY($${params.length})`);
  } else if (filter.team) {
    params.push(asId(filter.team));
    clauses.push(`m.team_id = $${params.length}`);
  }
  if (filter.weeklyViews?.$gt != null) {
    params.push(filter.weeklyViews.$gt);
    clauses.push(`m.weekly_views > $${params.length}`);
  }
  if (filter.views?.$gt != null) {
    params.push(filter.views.$gt);
    clauses.push(`m.views > $${params.length}`);
  }
  for (const [k, v] of Object.entries(filter)) {
    if (!k.startsWith("dailyViews.")) continue;
    params.push(k.slice("dailyViews.".length));
    const min = v?.$gt != null ? Number(v.$gt) : 0;
    clauses.push(
      `EXISTS (SELECT 1 FROM arc.manhua_daily_views d WHERE d.manhua_id=m.id AND d.day_key=$${params.length} AND d.views > ${min})`
    );
  }
  if (filter.$or) {
    const searchOrs = [];
    const ownerOrs = [];
    for (const part of filter.$or) {
      if (part.title?.$regex) {
        params.push(`%${part.title.$regex}%`);
        searchOrs.push(`m.title ILIKE $${params.length}`);
      }
      if (part.titleEn?.$regex) {
        params.push(`%${part.titleEn.$regex}%`);
        searchOrs.push(`m.title_en ILIKE $${params.length}`);
      }
      if (part.createdBy) {
        params.push(asId(part.createdBy));
        ownerOrs.push(`m.created_by = $${params.length}`);
      }
      if (part.owners) {
        params.push(asId(part.owners));
        ownerOrs.push(
          `EXISTS (SELECT 1 FROM arc.manhua_owners o WHERE o.manhua_id=m.id AND o.user_id=$${params.length})`
        );
      }
      if (part.team?.$in) {
        params.push(asIdList(part.team.$in));
        ownerOrs.push(`m.team_id = ANY($${params.length})`);
      } else if (part.team) {
        params.push(asId(part.team));
        ownerOrs.push(`m.team_id = $${params.length}`);
      }
    }
    if (searchOrs.length) clauses.push(`(${searchOrs.join(" OR ")})`);
    if (ownerOrs.length) clauses.push(`(${ownerOrs.join(" OR ")})`);
  }
  return { where: clauses.length ? clauses.join(" AND ") : "true", params };
}

const Manhua = {
  find(filter) {
    return new ManhuaQuery(filter, { one: false });
  },
  findOne(filter) {
    return new ManhuaQuery(filter, { one: true });
  },
  findById(id) {
    return new ManhuaQuery({ _id: id }, { one: true });
  },
  countDocuments(filter) {
    return new ManhuaQuery(filter || {}).countDocuments();
  },
  async distinct(field) {
    if (field !== "team") throw new Error("Unsupported Manhua.distinct");
    const r = await query(
      `SELECT DISTINCT team_id FROM arc.manhuas WHERE team_id IS NOT NULL AND deleted_at IS NULL`
    );
    return r.rows.map((row) => row.team_id);
  },
  async create(input) {
    const id = asId(input._id) || newId();
    const slug = makeSlug(input);
    try {
      await query(
        `INSERT INTO arc.manhuas (
          id, title, title_en, slug, rating, description, cover_image, cover_image_url,
          rating_average, rating_count, status, created_by, team_id, views, weekly_views,
          extra, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'{}'::jsonb,now(),now()
        )`,
        [
          id,
          input.title,
          input.titleEn || null,
          slug,
          Number(input.rating || 0),
          input.description || null,
          input.coverImage || null,
          input.coverImageUrl || null,
          Number(input.ratingAverage || 0),
          Number(input.ratingCount || 0),
          input.status || "ongoing",
          asId(input.createdBy),
          input.team ? asId(input.team) : null,
          Number(input.views || 0),
          Number(input.weeklyViews || 0),
        ]
      );
    } catch (err) {
      wrapPg(err);
    }
    await replaceGenres(id, input.genres || []);
    await replaceOwners(id, input.owners || [input.createdBy].filter(Boolean));
    return Manhua.findById(id);
  },
  async updateOne(filter, update) {
    if (update?.$inc && !update.$set && !update.$unset) {
      const id = asId(filter._id);
      if (!id) return { matchedCount: 0, modifiedCount: 0 };
      await applyViewInc("manhua", id, update.$inc);
      return { matchedCount: 1, modifiedCount: 1 };
    }
    const current = await new ManhuaQuery(filter, { one: true, withDeleted: true }).exec();
    if (!current) return { matchedCount: 0, modifiedCount: 0 };
    applyDocUpdate(current, update);
    await saveManhua(current);
    return { matchedCount: 1, modifiedCount: 1 };
  },
  findByIdAndUpdate(id, update, opts = {}) {
    const q = {
      _lean: false,
      lean() {
        q._lean = true;
        return q;
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        await Manhua.updateOne({ _id: id }, update.$set ? update : { $set: update });
        const doc = await Manhua.findById(id).setOptions({ withDeleted: true });
        return q._lean || opts.new !== false ? doc : doc;
      },
    };
    if (opts.new) return q;
    return q;
  },
  deleteOne(filter) {
    const q = {
      setOptions() {
        return q;
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const r = await query("DELETE FROM arc.manhuas WHERE id=$1", [asId(filter._id)]);
        return { deletedCount: r.rowCount };
      },
    };
    return q;
  },
  bulkWrite(ops) {
    return bulkWrite(Manhua, ops);
  },
  async updateMany(filter, update) {
    if (filter.weeklyViews?.$gt != null && update.$set?.weeklyViews === 0) {
      const r = await query(
        `UPDATE arc.manhuas SET weekly_views=0, updated_at=now() WHERE weekly_views > $1`,
        [filter.weeklyViews.$gt]
      );
      return { matchedCount: r.rowCount, modifiedCount: r.rowCount };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  },
  async aggregate(pipeline = []) {
    const match = pipeline[0]?.$match || {};
    const group = pipeline.find((s) => s.$group)?.$group;
    if (group?._id === "$createdBy") {
      const { where, params } = compile(match, false);
      const r = await query(
        `SELECT created_by AS _id, count(*)::int AS count
         FROM arc.manhuas m WHERE ${where}
         GROUP BY created_by`,
        params
      );
      return r.rows;
    }
    throw new Error("Unsupported Manhua.aggregate pipeline");
  },
};

module.exports = Manhua;
