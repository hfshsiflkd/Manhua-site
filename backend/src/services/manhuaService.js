// src/services/manhuaService.js
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

/**
 * query-с filter үүсгэнэ
 */
function buildFilter(query = {}) {
  const { q, genre, status } = query;
  const filter = {};

  if (q) filter.title = { $regex: q, $options: "i" };
  if (genre) filter.genres = genre;
  if (status) filter.status = status;

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
    { $match: { manhua: { $in: manhuaIds }, status: "published" } },
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

  const { manhuas, total } = await getManhuas(filter, page, limit);
  const lastChapterMap = await getLastChapters(manhuas.map((m) => m._id));

  const items = manhuas.map((m) => {
    const last = lastChapterMap.get(String(m._id));
    return {
      ...m,
      lastChapterNumber: last?.lastChapterNumber || null,
      lastChapterId: last?.lastChapterId || null,
      lastChapterAt: last?.lastChapterAt || null,
    };
  });

  return { items, total };
};

/**
 * Single manhua
 */
exports.fetchManhuaBySlug = async (slug) => {
  return Manhua.findOne({ slug }).lean();
};
