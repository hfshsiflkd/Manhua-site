// src/services/manhua.service.js
const Manhua = require("../models/Manhua");
const { MemoryCache } = require("../cache/memoryCache");

const manhuaIdCache = new MemoryCache(); // slug -> id cache

async function getManhuaIdBySlug(slug) {
  const cached = manhuaIdCache.get(slug);
  if (cached) return cached;

  const m = await Manhua.findOne({ slug }).select("_id").lean();
  if (!m) return null;

  manhuaIdCache.set(slug, m._id, 5 * 60_000); // 5 минут (та хүсвэл)
  return m._id;
}

async function findManhuaBySlugOrId(slugOrId) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(slugOrId);
  if (isObjectId) {
    const byId = await Manhua.findById(slugOrId);
    if (byId) return byId;
  }
  return Manhua.findOne({ slug: slugOrId });
}

module.exports = { getManhuaIdBySlug, findManhuaBySlugOrId };
