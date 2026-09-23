"use strict";

const { query, asId, newId, wrapPg } = require("./helpers");

function rowToFav(row) {
  if (!row) return null;
  const fav = {
    _id: row.id,
    user: row.user_id,
    manhua: row.manhua_doc || row.manhua_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return fav;
}

class FavQuery {
  constructor(filter, { one = false, populateManhua = false } = {}) {
    this.filter = filter;
    this.one = one;
    this.populateManhua = populateManhua;
    this._lean = false;
  }
  populate(field) {
    if (field === "manhua") this.populateManhua = true;
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
    let sql = `SELECT f.*`;
    if (this.populateManhua) {
      sql += `, json_build_object(
        '_id', m.id, 'title', m.title, 'slug', m.slug,
        'coverImageUrl', m.cover_image_url, 'coverImage', m.cover_image
      ) AS manhua_doc`;
    }
    sql += ` FROM arc.favorites f`;
    if (this.populateManhua) sql += ` LEFT JOIN arc.manhuas m ON m.id = f.manhua_id`;
    sql += ` WHERE f.user_id=$1`;
    if (this.filter.manhua) {
      params.push(asId(this.filter.manhua));
      sql += ` AND f.manhua_id=$${params.length}`;
    }
    const r = await query(sql, params);
    const rows = r.rows.map(rowToFav);
    return this.one ? rows[0] || null : rows;
  }
}

const Favorite = {
  find(filter) {
    return new FavQuery(filter);
  },
  findOne(filter) {
    return new FavQuery(filter, { one: true });
  },
  async create(input) {
    const id = newId();
    try {
      await query(
        `INSERT INTO arc.favorites (id, user_id, manhua_id, extra, created_at, updated_at)
         VALUES ($1,$2,$3,'{}'::jsonb,now(),now())`,
        [id, asId(input.user), asId(input.manhua)]
      );
    } catch (err) {
      wrapPg(err);
    }
    return { _id: id, user: asId(input.user), manhua: asId(input.manhua) };
  },
  async findOneAndDelete(filter) {
    const r = await query(
      `DELETE FROM arc.favorites WHERE user_id=$1 AND manhua_id=$2 RETURNING id`,
      [asId(filter.user), asId(filter.manhua)]
    );
    return r.rows[0] ? { _id: r.rows[0].id } : null;
  },
  async findOneAndUpdate(filter, _update, opts = {}) {
    const existing = await Favorite.findOne(filter);
    if (existing) return existing;
    if (opts.upsert) return Favorite.create(filter);
    return null;
  },
};

module.exports = Favorite;
