"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query, withTransaction } = require("../../db/postgres");

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

function asId(value) {
  if (value == null) return null;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (typeof value.toHexString === "function") return value.toHexString();
  }
  return String(value);
}

function asIdList(value) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map(asId).filter(Boolean);
}

function duplicateError(constraint) {
  const err = new Error("E11000 duplicate key");
  err.code = 11000;
  err.keyPattern = constraint || {};
  return err;
}

function wrapPg(err) {
  if (err && err.code === "23505") throw duplicateError();
  throw err;
}

function oidRegex() {
  return /^[0-9a-fA-F]{24}$/;
}

function looksHashed(password) {
  return typeof password === "string" && /^\$2[aby]\$/.test(password);
}

async function hashPassword(password) {
  if (looksHashed(password)) return password;
  return bcrypt.hash(String(password), 10);
}

function pick(doc, select) {
  if (!doc || !select) return doc;
  if (typeof select === "string") {
    const fields = select.trim().split(/\s+/);
    const out = { _id: doc._id };
    for (const f of fields) {
      if (!f || f.startsWith("-")) continue;
      out[f] = doc[f];
    }
    return out;
  }
  if (typeof select === "object") {
    const include = Object.entries(select).filter(([, v]) => v);
    if (!include.length) return doc;
    const out = { _id: doc._id };
    for (const [k] of include) out[k] = doc[k];
    return out;
  }
  return doc;
}

function thenable(execImpl) {
  const q = {
    then(resolve, reject) {
      return q.exec().then(resolve, reject);
    },
    exec() {
      return execImpl(q);
    },
  };
  return q;
}

function applyDocUpdate(doc, update) {
  if (!update || typeof update !== "object") return doc;
  const set = update.$set;
  const inc = update.$inc;
  const unset = update.$unset;
  if (inc) {
    for (const [k, v] of Object.entries(inc)) {
      const n = Number(v) || 0;
      if (k.startsWith("dailyViews.")) {
        const day = k.slice("dailyViews.".length);
        doc.dailyViews = doc.dailyViews || {};
        doc.dailyViews[day] = Number(doc.dailyViews[day] || 0) + n;
      } else if (k.startsWith("monthlyViews.")) {
        const month = k.slice("monthlyViews.".length);
        doc.monthlyViews = doc.monthlyViews || {};
        doc.monthlyViews[month] = Number(doc.monthlyViews[month] || 0) + n;
      } else {
        doc[k] = Number(doc[k] || 0) + n;
      }
    }
  }
  if (set) Object.assign(doc, set);
  if (unset) {
    for (const k of Object.keys(unset)) doc[k] = undefined;
  }
  if (!set && !inc && !unset && !update.$push && !update.$setOnInsert) {
    Object.assign(doc, update);
  }
  return doc;
}

async function applyViewInc(kind, id, inc = {}) {
  const { assertWritesAllowed } = require("../../config/writeGate");
  assertWritesAllowed("applyViewInc");
  const views = Number(inc.views || 0);
  const weekly = Number(inc.weeklyViews || 0);
  if (kind === "manhua") {
    if (views || weekly) {
      await query(
        `UPDATE arc.manhuas SET views = views + $2, weekly_views = weekly_views + $3, updated_at = now() WHERE id = $1`,
        [id, views, weekly]
      );
    }
    for (const [k, v] of Object.entries(inc)) {
      if (!k.startsWith("dailyViews.")) continue;
      await query(
        `INSERT INTO arc.manhua_daily_views (manhua_id, day_key, views)
         VALUES ($1,$2,$3)
         ON CONFLICT (manhua_id, day_key)
         DO UPDATE SET views = arc.manhua_daily_views.views + EXCLUDED.views`,
        [id, k.slice("dailyViews.".length), Number(v) || 0]
      );
    }
    return;
  }
  if (views) {
    await query(
      `UPDATE arc.chapters SET views = views + $2, updated_at = now() WHERE id = $1`,
      [id, views]
    );
  }
  for (const [k, v] of Object.entries(inc)) {
    if (k.startsWith("dailyViews.")) {
      await query(
        `INSERT INTO arc.chapter_daily_views (chapter_id, day_key, views)
         VALUES ($1,$2,$3)
         ON CONFLICT (chapter_id, day_key)
         DO UPDATE SET views = arc.chapter_daily_views.views + EXCLUDED.views`,
        [id, k.slice("dailyViews.".length), Number(v) || 0]
      );
    }
    if (k.startsWith("monthlyViews.")) {
      await query(
        `INSERT INTO arc.chapter_monthly_views (chapter_id, month_key, views)
         VALUES ($1,$2,$3)
         ON CONFLICT (chapter_id, month_key)
         DO UPDATE SET views = arc.chapter_monthly_views.views + EXCLUDED.views`,
        [id, k.slice("monthlyViews.".length), Number(v) || 0]
      );
    }
  }
}

function makeSlug(input) {
  if (input.slug) return input.slug;
  const slugSource = input.titleEn || input.title || "";
  return String(slugSource)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)+/g, "");
}

async function bulkWrite(model, ops = []) {
  for (const op of ops) {
    if (op.updateOne) {
      await model.updateOne(op.updateOne.filter, op.updateOne.update);
    } else if (op.deleteOne) {
      await model.deleteOne(op.deleteOne.filter);
    }
  }
  return { ok: 1 };
}

module.exports = {
  query,
  withTransaction,
  newId,
  asId,
  asIdList,
  duplicateError,
  wrapPg,
  oidRegex,
  looksHashed,
  hashPassword,
  pick,
  thenable,
  applyDocUpdate,
  applyViewInc,
  makeSlug,
  bulkWrite,
};
