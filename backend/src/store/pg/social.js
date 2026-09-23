"use strict";

const { query, asId, newId, wrapPg, pick } = require("./helpers");

function rowToBookmark(row) {
  if (!row) return null;
  return {
    _id: row.id,
    user: row.user_id,
    manhua: row.manhua_doc || row.manhua_id,
    chapterNumber: Number(row.chapter_number),
    pageNumber: Number(row.page_number),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class BookmarkQuery {
  constructor(filter, { one = false } = {}) {
    this.filter = filter || {};
    this.one = one;
    this._populate = false;
    this._lean = false;
  }
  populate(field) {
    if (field === "manhua") this._populate = true;
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
    const params = [asId(this.filter.user)];
    let sql = `SELECT b.*`;
    if (this._populate) {
      sql += `, json_build_object(
        '_id', m.id, 'title', m.title, 'slug', m.slug,
        'coverImageUrl', m.cover_image_url, 'coverImage', m.cover_image
      ) AS manhua_doc`;
    }
    sql += ` FROM arc.reading_bookmarks b`;
    if (this._populate) sql += ` LEFT JOIN arc.manhuas m ON m.id = b.manhua_id`;
    sql += ` WHERE b.user_id=$1`;
    if (this.filter.manhua) {
      params.push(asId(this.filter.manhua));
      sql += ` AND b.manhua_id=$${params.length}`;
    }
    const r = await query(sql, params);
    const rows = r.rows.map(rowToBookmark);
    return this.one ? rows[0] || null : rows;
  }
}

const Bookmark = {
  find(filter) {
    return new BookmarkQuery(filter);
  },
  findOne(filter) {
    return new BookmarkQuery(filter, { one: true });
  },
  async create(input) {
    const id = newId();
    try {
      await query(
        `INSERT INTO arc.reading_bookmarks (id, user_id, manhua_id, chapter_number, page_number, extra, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,now(),now())`,
        [
          id,
          asId(input.user),
          asId(input.manhua),
          Number(input.chapterNumber || 1),
          Number(input.pageNumber || 1),
        ]
      );
    } catch (err) {
      wrapPg(err);
    }
    return {
      _id: id,
      user: asId(input.user),
      manhua: asId(input.manhua),
      chapterNumber: Number(input.chapterNumber || 1),
      pageNumber: Number(input.pageNumber || 1),
    };
  },
  async findOneAndDelete(filter) {
    const r = await query(
      `DELETE FROM arc.reading_bookmarks WHERE user_id=$1 AND manhua_id=$2 RETURNING id`,
      [asId(filter.user), asId(filter.manhua)]
    );
    return r.rows[0] ? { _id: r.rows[0].id } : null;
  },
  async findOneAndUpdate(filter, update, opts = {}) {
    const existing = await Bookmark.findOne(filter);
    const chapterNumber = update.chapterNumber;
    const pageNumber = update.pageNumber;
    if (existing) {
      await query(
        `UPDATE arc.reading_bookmarks SET chapter_number=$3, page_number=$4, updated_at=now()
         WHERE user_id=$1 AND manhua_id=$2`,
        [asId(filter.user), asId(filter.manhua), chapterNumber, pageNumber]
      );
      return { ...existing, chapterNumber, pageNumber };
    }
    if (opts.upsert) {
      return Bookmark.create({
        user: filter.user,
        manhua: filter.manhua,
        chapterNumber,
        pageNumber,
      });
    }
    return null;
  },
};

function rowToComment(row) {
  if (!row) return null;
  return {
    _id: row.id,
    user: row.user_id,
    username: row.username_snapshot,
    chapter: row.chapter_id,
    manhua: row.manhua_id,
    text: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class CommentQuery {
  constructor(filter, { one = false } = {}) {
    this.filter = filter || {};
    this.one = one;
    this._sort = { createdAt: -1 };
    this._skip = 0;
    this._limit = null;
    this._select = null;
    this._lean = false;
  }
  sort(spec) {
    this._sort = spec;
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
  select(spec) {
    this._select = spec;
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
    if (this.filter.manhua) {
      params.push(asId(this.filter.manhua));
      clauses.push(`manhua_id=$${params.length}`);
    }
    if (this.filter.chapter) {
      params.push(asId(this.filter.chapter));
      clauses.push(`chapter_id=$${params.length}`);
    }
    if (this.filter.user) {
      params.push(asId(this.filter.user));
      clauses.push(`user_id=$${params.length}`);
    }
    let sql = `SELECT * FROM arc.comments WHERE ${clauses.length ? clauses.join(" AND ") : "true"}`;
    sql += this._sort?.createdAt === 1 ? " ORDER BY created_at ASC" : " ORDER BY created_at DESC";
    if (this._limit != null) {
      params.push(this._limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (this._skip) {
      params.push(this._skip);
      sql += ` OFFSET $${params.length}`;
    }
    const r = await query(sql, params);
    const rows = r.rows.map((row) => pick(rowToComment(row), this._select));
    return this.one ? rows[0] || null : rows;
  }
}

const Comment = {
  find(filter) {
    return new CommentQuery(filter);
  },
  findOne(filter) {
    return new CommentQuery(filter, { one: true });
  },
  findById(id) {
    return new CommentQuery({ _id: id }, { one: true });
  },
  async countDocuments(filter) {
    const params = [];
    const clauses = [];
    if (filter?.manhua) {
      params.push(asId(filter.manhua));
      clauses.push(`manhua_id=$${params.length}`);
    }
    if (filter?.chapter) {
      params.push(asId(filter.chapter));
      clauses.push(`chapter_id=$${params.length}`);
    }
    const r = await query(
      `SELECT count(*)::int AS n FROM arc.comments WHERE ${clauses.length ? clauses.join(" AND ") : "true"}`,
      params
    );
    return r.rows[0].n;
  },
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.comments (id, user_id, username_snapshot, chapter_id, manhua_id, body, extra, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,now(),now())`,
      [
        id,
        asId(input.user),
        input.username,
        input.chapter ? asId(input.chapter) : null,
        input.manhua ? asId(input.manhua) : null,
        input.text,
      ]
    );
    return Comment.findById(id);
  },
  async findByIdAndDelete(id) {
    const current = await Comment.findById(id);
    await query("DELETE FROM arc.comments WHERE id=$1", [asId(id)]);
    return current;
  },
};

module.exports = { Bookmark, Comment };
