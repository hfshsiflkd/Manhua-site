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
  bulkWrite,
} = require("./helpers");

function rowToChapter(row) {
  if (!row) return null;
  return {
    _id: row.id,
    manhua: row.manhua_doc || row.manhua_id,
    chapterNumber: Number(row.chapter_number),
    title: row.title,
    language: row.language,
    status: row.status,
    views: Number(row.views || 0),
    pages: row.pages || [],
    dailyViews: row.daily_views || {},
    monthlyViews: row.monthly_views || {},
    uploadedBy: row.uploaded_by,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE = `
  SELECT c.*,
    COALESCE((
      SELECT json_agg(json_build_object(
        'pageNumber', p.page_number,
        'imageUrl', p.image_url,
        'originalName', p.original_name,
        'width', p.width,
        'height', p.height
      ) ORDER BY p.page_number)
      FROM arc.chapter_pages p WHERE p.chapter_id = c.id
    ), '[]'::json) AS pages,
    COALESCE((SELECT json_object_agg(d.day_key, d.views) FROM arc.chapter_daily_views d WHERE d.chapter_id = c.id), '{}'::json) AS daily_views,
    COALESCE((SELECT json_object_agg(mo.month_key, mo.views) FROM arc.chapter_monthly_views mo WHERE mo.chapter_id = c.id), '{}'::json) AS monthly_views
  FROM arc.chapters c
`;

async function replacePages(id, pages) {
  await query("DELETE FROM arc.chapter_pages WHERE chapter_id=$1", [id]);
  const list = Array.isArray(pages) ? pages : [];
  for (let i = 0; i < list.length; i += 1) {
    const page = list[i] || {};
    await query(
      `INSERT INTO arc.chapter_pages (chapter_id, page_number, image_url, original_name, width, height, extra)
       VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb)`,
      [
        id,
        Number.isFinite(Number(page.pageNumber)) ? Number(page.pageNumber) : i + 1,
        page.imageUrl,
        page.originalName || null,
        page.width ?? null,
        page.height ?? null,
      ]
    );
  }
}

async function saveChapter(doc) {
  await query(
    `UPDATE arc.chapters SET
      manhua_id=$2, chapter_number=$3, title=$4, language=$5, status=$6, views=$7,
      uploaded_by=$8, deleted_at=$9, deleted_by=$10, extra='{}'::jsonb, updated_at=now()
     WHERE id=$1`,
    [
      asId(doc._id),
      asId(doc.manhua?._id || doc.manhua),
      doc.chapterNumber,
      doc.title || null,
      doc.language || "mn",
      doc.status || "draft",
      Number(doc.views || 0),
      doc.uploadedBy ? asId(doc.uploadedBy) : null,
      doc.deletedAt || null,
      doc.deletedBy ? asId(doc.deletedBy) : null,
    ]
  );
  if (Array.isArray(doc.pages)) await replacePages(asId(doc._id), doc.pages);
  return doc;
}

function wrap(doc) {
  if (!doc) return null;
  doc.save = async function save() {
    return saveChapter(doc);
  };
  return doc;
}

class ChapterQuery {
  constructor(filter = {}, { one = false, withDeleted = false } = {}) {
    this.filter = filter;
    this.one = one;
    this.withDeleted = withDeleted;
    this._sort = { chapterNumber: 1 };
    this._lean = false;
    this._select = null;
    this._skip = 0;
    this._limit = null;
    this._populateManhua = false;
    this._populateManhuaSelect = null;
  }
  sort(spec) {
    this._sort = spec;
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
  populate(field, select) {
    if (field === "manhua" || field?.path === "manhua") {
      this._populateManhua = true;
      this._populateManhuaSelect = select || field?.select || null;
    }
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
  setOptions(opts = {}) {
    if (opts.withDeleted) this.withDeleted = true;
    return this;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  async exec() {
    const { where, params } = compile(this.filter, this.withDeleted);
    let sql = `${BASE} WHERE ${where}`;
    sql += orderSql(this._sort);
    if (this._limit != null) {
      params.push(this._limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (this._skip) {
      params.push(this._skip);
      sql += ` OFFSET $${params.length}`;
    }
    const r = await query(sql, params);
    const rows = r.rows.map((row) => wrap(pick(rowToChapter(row), this._select)));
    if (this._populateManhua) {
      const Manhua = require("./Manhua");
      for (const doc of rows) {
        if (!doc) continue;
        const q = Manhua.findById(asId(doc.manhua));
        if (this._populateManhuaSelect) q.select(this._populateManhuaSelect);
        doc.manhua = await q.lean();
      }
    }
    return this.one ? rows[0] || null : rows;
  }
}

function orderSql(sort) {
  if (!sort) return "";
  const map = {
    chapterNumber: "c.chapter_number",
    createdAt: "c.created_at",
    updatedAt: "c.updated_at",
  };
  const parts = [];
  for (const [k, dir] of Object.entries(sort)) {
    if (map[k]) parts.push(`${map[k]} ${dir === -1 || dir === "desc" ? "DESC" : "ASC"}`);
  }
  return parts.length ? ` ORDER BY ${parts.join(", ")}` : "";
}

function compile(filter, withDeleted = false) {
  const params = [];
  const clauses = [];
  if (!withDeleted && filter.deletedAt === undefined) clauses.push("c.deleted_at IS NULL");
  if (filter.deletedAt === null) clauses.push("c.deleted_at IS NULL");
  if (!withDeleted) {
    clauses.push(
      `EXISTS (SELECT 1 FROM arc.manhuas pm WHERE pm.id = c.manhua_id AND pm.deleted_at IS NULL)`
    );
  }
  if (filter._id && typeof filter._id !== "object") {
    params.push(asId(filter._id));
    clauses.push(`c.id = $${params.length}`);
  }
  if (filter.manhua?.$in) {
    params.push(asIdList(filter.manhua.$in));
    clauses.push(`c.manhua_id = ANY($${params.length})`);
  } else if (filter.manhua) {
    params.push(asId(filter.manhua));
    clauses.push(`c.manhua_id = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`c.status = $${params.length}`);
  }
  if (filter.language) {
    params.push(filter.language);
    clauses.push(`c.language = $${params.length}`);
  }
  if (filter.chapterNumber != null && typeof filter.chapterNumber !== "object") {
    params.push(filter.chapterNumber);
    clauses.push(`c.chapter_number = $${params.length}`);
  }
  if (filter.uploadedBy?.$in) {
    params.push(asIdList(filter.uploadedBy.$in));
    clauses.push(`c.uploaded_by = ANY($${params.length})`);
  } else if (filter.uploadedBy) {
    params.push(asId(filter.uploadedBy));
    clauses.push(`c.uploaded_by = $${params.length}`);
  }
  if (filter.createdAt?.$gte) {
    params.push(filter.createdAt.$gte);
    clauses.push(`c.created_at >= $${params.length}`);
  }
  if (filter.createdAt?.$lt) {
    params.push(filter.createdAt.$lt);
    clauses.push(`c.created_at < $${params.length}`);
  }
  return { where: clauses.length ? clauses.join(" AND ") : "true", params };
}

async function lastChapterAggregate(match) {
  const ids = asIdList(match.manhua?.$in || match.manhua);
  const params = [ids];
  const r = await query(
    `SELECT DISTINCT ON (manhua_id)
        manhua_id AS _id,
        chapter_number AS "lastChapterNumber",
        id AS "lastChapterId",
        created_at AS "lastChapterAt",
        chapter_number AS "latestChapter",
        created_at AS "latestChapterCreatedAt",
        1 AS dummy
     FROM arc.chapters
     WHERE manhua_id = ANY($1) AND status='published' AND deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM arc.manhuas pm WHERE pm.id = arc.chapters.manhua_id AND pm.deleted_at IS NULL)
     ORDER BY manhua_id, chapter_number DESC, created_at DESC`,
    params
  );
  const counts = await query(
    `SELECT manhua_id AS _id, count(*)::int AS count
     FROM arc.chapters
     WHERE manhua_id = ANY($1) AND status='published' AND deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM arc.manhuas pm WHERE pm.id = arc.chapters.manhua_id AND pm.deleted_at IS NULL)
     GROUP BY manhua_id`,
    params
  );
  const countMap = new Map(counts.rows.map((row) => [row._id, row.count]));
  return r.rows.map((row) => ({
    ...row,
    count: countMap.get(row._id) || 0,
  }));
}

const Chapter = {
  find(filter) {
    return new ChapterQuery(filter);
  },
  findOne(filter) {
    return new ChapterQuery(filter, { one: true });
  },
  findById(id) {
    return new ChapterQuery({ _id: id }, { one: true });
  },
  countDocuments(filter) {
    const q = new ChapterQuery(filter || {});
    return (async () => {
      const { where, params } = compile(q.filter, q.withDeleted);
      const r = await query(`SELECT count(*)::int AS n FROM arc.chapters c WHERE ${where}`, params);
      return r.rows[0].n;
    })();
  },
  async create(input) {
    const id = asId(input._id) || newId();
    try {
      await query(
        `INSERT INTO arc.chapters (
          id, manhua_id, chapter_number, title, language, status, views, uploaded_by,
          extra, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}'::jsonb,now(),now())`,
        [
          id,
          asId(input.manhua),
          input.chapterNumber,
          input.title || null,
          input.language || "mn",
          input.status || "draft",
          Number(input.views || 0),
          input.uploadedBy ? asId(input.uploadedBy) : null,
        ]
      );
    } catch (err) {
      wrapPg(err);
    }
    if (Array.isArray(input.pages)) await replacePages(id, input.pages);
    return Chapter.findById(id);
  },
  async updateOne(filter, update) {
    if (update?.$inc && !update.$set) {
      const id = asId(filter._id);
      if (!id) return { matchedCount: 0, modifiedCount: 0 };
      await applyViewInc("chapter", id, update.$inc);
      return { matchedCount: 1, modifiedCount: 1 };
    }
    const current = await new ChapterQuery(filter, { one: true }).exec();
    if (!current) return { matchedCount: 0, modifiedCount: 0 };
    applyDocUpdate(current, update);
    await saveChapter(current);
    return { matchedCount: 1, modifiedCount: 1 };
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
        const r = await query("DELETE FROM arc.chapters WHERE id=$1", [asId(filter._id)]);
        return { deletedCount: r.rowCount };
      },
    };
    return q;
  },
  bulkWrite(ops) {
    return bulkWrite(Chapter, ops);
  },
  async updateMany(filter, update) {
    if (filter.manhua && update.$set?.deletedAt) {
      const r = await query(
        `UPDATE arc.chapters SET deleted_at=$2, deleted_by=$3, updated_at=now()
         WHERE manhua_id=$1 AND deleted_at IS NULL`,
        [asId(filter.manhua), update.$set.deletedAt, update.$set.deletedBy ? asId(update.$set.deletedBy) : null]
      );
      return { matchedCount: r.rowCount, modifiedCount: r.rowCount };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  },
  async aggregate(pipeline) {
    const match = pipeline?.[0]?.$match || {};
    const facet = pipeline?.[1]?.$facet;
    if (facet?.current) {
      const manhuaId = asId(match.manhua);
      const currentMatch = facet.current[0]?.$match?.chapterNumber;
      const chNum = Number(currentMatch);
      const list = await query(
        `SELECT id, chapter_number, title, status, created_at, updated_at
         FROM arc.chapters c
         WHERE c.manhua_id=$1 AND c.language=$2 AND c.status=$3 AND c.deleted_at IS NULL
           AND EXISTS (SELECT 1 FROM arc.manhuas pm WHERE pm.id = c.manhua_id AND pm.deleted_at IS NULL)
         ORDER BY chapter_number ASC`,
        [manhuaId, match.language || "mn", match.status || "published"]
      );
      const rows = list.rows;
      const currentRow = rows.find((r) => Number(r.chapter_number) === chNum);
      if (!currentRow) return [{ current: [], prev: [], next: [] }];
      const idx = rows.findIndex((r) => r.id === currentRow.id);
      const prev = idx > 0 ? rows[idx - 1] : null;
      const next = idx < rows.length - 1 ? rows[idx + 1] : null;
      const full = await new ChapterQuery({ _id: currentRow.id }, { one: true }).exec();
      return [
        {
          current: [full],
          prev: prev ? [{ chapterNumber: Number(prev.chapter_number) }] : [],
          next: next ? [{ chapterNumber: Number(next.chapter_number) }] : [],
        },
      ];
    }
    if (pipeline.some((stage) => stage.$group)) {
      const group = pipeline.find((stage) => stage.$group).$group;
      if (group._id === "$uploadedBy") {
        const { where, params } = compile(match);
        const r = await query(
          `SELECT uploaded_by AS _id, count(*)::int AS count
           FROM arc.chapters c WHERE ${where}
           GROUP BY uploaded_by`,
          params
        );
        return r.rows;
      }
      return lastChapterAggregate(match);
    }
    throw new Error("Unsupported Chapter.aggregate pipeline");
  },
};

module.exports = Chapter;
