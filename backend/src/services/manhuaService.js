// src/services/manhuaService.js
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const redisCache = require("../cache/redisCache");

/**
 * query-с filter үүсгэнэ
 */
const mongoose = require("mongoose");

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilter(query = {}) {
  const { q, genre, status, teamId } = query;
  const filter = {};

  if (q && typeof q === "string") {
    const safeQ = escapeRegex(q.slice(0, 100));
    filter.$or = [
      { title: { $regex: safeQ, $options: "i" } },
      { titleEn: { $regex: safeQ, $options: "i" } },
    ];
  }
  if (genre) filter.genres = genre;
  if (status) filter.status = status;
  if (teamId) {
    if (teamId === "none") {
      filter.team = null;
    } else if (mongoose.Types.ObjectId.isValid(teamId)) {
      filter.team = new mongoose.Types.ObjectId(teamId);
    }
  }

  return filter;
}

/**
 * Manhua list + total
 */
async function getManhuas(filter, page, limit) {
  const total = await Manhua.countDocuments(filter);

  const manhuas = await Manhua.find(filter)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { manhuas, total };
}

/**
 * Manhua бүрийн хамгийн сүүлийн published chapter
 */
async function getLastChapters(manhuaIds = []) {
  if (!manhuaIds.length) return new Map();

  const data = await Chapter.aggregate([
    { $match: { manhua: { $in: manhuaIds }, status: "published", deletedAt: null } },
    { $sort: { chapterNumber: -1 } },
    {
      $group: {
        _id: "$manhua",
        lastChapterNumber: { $first: "$chapterNumber" },
        lastChapterId: { $first: "$_id" },
        lastChapterAt: { $first: "$createdAt" },
      },
    },
  ]);

  return new Map(data.map((d) => [String(d._id), d]));
}

exports.fetchManhuaList = async ({ query, page, limit }) => {
  const filter = buildFilter(query);
  // Filter байвал (search/genre) cache хийхгүй — үргэлж өөр result
  const isDefaultQuery = !query.q && !query.genre && !query.status && !query.teamId;
  const cKey = isDefaultQuery ? `manhua:list:${page}:${limit}` : null;

  if (cKey) {
    const cached = await redisCache.get(cKey);
    if (cached) return cached;
  }

  const { manhuas, total } = await getManhuas(filter, page, limit);
  const lastChapterMap = await getLastChapters(manhuas.map((m) => m._id));

  const items = manhuas.map((m) => {
    const last = lastChapterMap.get(String(m._id));
    return {
      ...m,
      ratingAverage: m.ratingAverage || m.rating || 0,
      lastChapterNumber: last?.lastChapterNumber || null,
      lastChapterId: last?.lastChapterId || null,
      lastChapterAt: last?.lastChapterAt || null,
    };
  });

  const result = { items, total };
  if (cKey) redisCache.set(cKey, result, 120).catch(() => {}); // 2 мин
  return result;
};

/**
 * Single manhua
 */
exports.fetchManhuaBySlug = async (slug) => {
  const cKey = `manhua:slug:${slug}`;
  const cached = await redisCache.get(cKey);
  if (cached) return cached;

  const manhua = await Manhua.findOne({ slug })
    .populate({
      path: "chapters",
      match: { status: "published" },
      options: { sort: { chapterNumber: 1 } },
      select: "chapterNumber title language status views createdAt updatedAt",
    })
    .lean();

  if (manhua) redisCache.set(cKey, manhua, 300).catch(() => {}); // 5 мин
  return manhua;
};
