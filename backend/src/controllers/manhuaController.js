// src/controllers/manhuaController.js
const {
  fetchManhuaList,
  fetchManhuaBySlug,
} = require("../services/manhuaService");

const { parsePagination } = require("../utils/pagination");
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const { MemoryCache } = require("../cache/memoryCache");

// In-memory cache for popular-today (60s TTL)
const popularTodayCache = new MemoryCache();

// GET /api/manhuas
exports.getManhuas = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);

    const { items, total } = await fetchManhuaList({
      query: req.query,
      page,
      limit,
    });

    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
};

// GET /api/manhuas/:slug
exports.getManhuaBySlug = async (req, res, next) => {
  try {
    const manhua = await fetchManhuaBySlug(req.params.slug);

    if (!manhua) {
      return res.status(404).json({ message: "Манхуа олдсонгүй" });
    }

    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

// GET /api/manhuas/popular-today
exports.getPopularToday = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 12;
    const todayKey = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const cacheKey = `popular-today-${todayKey}-${limit}`;

    // Check cache first
    const cached = popularTodayCache.get(cacheKey);
    if (cached) {
      res.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=120"
      );
      return res.json(cached);
    }

    // Get manhuas with today's views, sorted by today's views desc
    const manhuas = await Manhua.find({
      [`dailyViews.${todayKey}`]: { $exists: true, $gt: 0 },
    })
      .sort({ [`dailyViews.${todayKey}`]: -1 })
      .limit(limit)
      .select(
        "title slug coverImageUrl coverImage ratingAverage rating views updatedAt dailyViews"
      )
      .lean();

    // If no today data, fallback to weeklyViews
    let results = manhuas;
    if (results.length < limit) {
      const fallback = await Manhua.find({
        weeklyViews: { $gt: 0 },
        _id: { $nin: results.map((m) => m._id) },
      })
        .sort({ weeklyViews: -1 })
        .limit(limit - results.length)
        .select(
          "title slug coverImageUrl coverImage ratingAverage rating views updatedAt"
        )
        .lean();

      results = [...results, ...fallback];
    }

    // If still not enough, fallback to total views
    if (results.length < limit) {
      const totalFallback = await Manhua.find({
        views: { $gt: 0 },
        _id: { $nin: results.map((m) => m._id) },
      })
        .sort({ views: -1 })
        .limit(limit - results.length)
        .select(
          "title slug coverImageUrl coverImage ratingAverage rating views updatedAt"
        )
        .lean();

      results = [...results, ...totalFallback];
    }

    // Get chapter counts and latest chapter info (with createdAt)
    const manhuaIds = results.map((m) => m._id);
    const chapterCounts = await Chapter.aggregate([
      {
        $match: {
          manhua: { $in: manhuaIds },
          status: "published",
        },
      },
      {
        $sort: { chapterNumber: -1, createdAt: -1 },
      },
      {
        $group: {
          _id: "$manhua",
          count: { $sum: 1 },
          latestChapter: { $first: "$chapterNumber" },
          latestChapterCreatedAt: { $first: "$createdAt" },
        },
      },
    ]);

    const chapterMap = new Map();
    chapterCounts.forEach((item) => {
      chapterMap.set(item._id.toString(), {
        count: item.count,
        latestChapter: item.latestChapter,
        latestChapterCreatedAt: item.latestChapterCreatedAt,
      });
    });

    // Enrich results with chapter info and today's views
    const enriched = results.map((manhua) => {
      const chapterInfo = chapterMap.get(manhua._id.toString());
      // dailyViews is a Map in Mongoose, but plain object when using .lean()
      const dailyViewsObj = manhua.dailyViews || {};
      const todayViews = dailyViewsObj[todayKey] || 0;

      return {
        _id: manhua._id,
        title: manhua.title,
        slug: manhua.slug,
        coverImage: manhua.coverImage,
        coverImageUrl: manhua.coverImageUrl,
        ratingAverage: manhua.ratingAverage || manhua.rating || 0,
        viewsToday: todayViews,
        chaptersCount: chapterInfo?.count || 0,
        latestChapterNumber: chapterInfo?.latestChapter || null,
        latestChapterAddedAt: chapterInfo?.latestChapterCreatedAt || null,
      };
    });

    // Cache the result (60 seconds TTL)
    popularTodayCache.set(cacheKey, enriched, 60_000);

    // Cache headers
    res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// GET /api/home
exports.getHomeSections = async (req, res, next) => {
  try {
    const HERO_LIMIT = 5;
    const POPULAR_LIMIT = 8;
    const LATEST_LIMIT = 50;
    const LATEST_UPDATES_LIMIT = 50;

    const hero = await Manhua.find({})
      .sort({ rating: -1 })
      .limit(HERO_LIMIT)
      .select(
        "title slug coverImageUrl coverImage rating genres status description"
      )
      .lean();

    // Use the new popular-today endpoint logic (simplified for home)
    const todayKey = new Date().toISOString().split("T")[0];
    const popularToday = await Manhua.find({
      [`dailyViews.${todayKey}`]: { $exists: true, $gt: 0 },
    })
      .sort({ [`dailyViews.${todayKey}`]: -1 })
      .limit(POPULAR_LIMIT)
      .select("title slug coverImageUrl coverImage rating ratingAverage")
      .lean();

    const latest = await Manhua.find({})
      .sort({ updatedAt: -1 })
      .limit(LATEST_LIMIT)
      .select("title slug coverImageUrl coverImage rating updatedAt")
      .lean();

    // 🔥 Latest updates (flat feed with latest 3 chapters per manhua, sorted by createdAt DESC)
    const latestUpdatesLimit = Number(req.query.latestUpdatesLimit) || 6;
    const rawChapters = await Chapter.find({
      status: "published",
    })
      .sort({ createdAt: -1 }) // newest added first
      .limit(latestUpdatesLimit * 12) // take enough to build per-series lists
      .populate({
        path: "manhua",
        select: "title slug coverImageUrl coverImage rating updatedAt",
      })
      .lean();

    const updatesMap = new Map();

    for (const ch of rawChapters) {
      if (!ch.manhua) continue;
      const key = ch.manhua._id.toString();
      // Use createdAt (when chapter was added/uploaded) as the base date
      const baseDate = ch.createdAt;
      if (!baseDate) continue;

      if (!updatesMap.has(key)) {
        updatesMap.set(key, {
          manhuaId: key,
          title: ch.manhua.title,
          slug: ch.manhua.slug,
          cover: ch.manhua.coverImageUrl || ch.manhua.coverImage || null,
          latestDate: new Date(baseDate).getTime(),
          latestChapters: [],
        });
      }

      const group = updatesMap.get(key);
      const ts = new Date(baseDate).getTime();
      if (ts > group.latestDate) group.latestDate = ts;

      if (group.latestChapters.length < 3) {
        group.latestChapters.push({
          chapterNumber:
            ch.chapterNumber ??
            (typeof ch.number === "number" ? ch.number : undefined),
          name: ch.name || ch.title || undefined,
          createdAt: ch.createdAt, // Only include createdAt for time display
        });
      }
    }

    let latestUpdates = Array.from(updatesMap.values())
      .map((item) => {
        // Sort chapters by createdAt DESC (newest added first)
        const chapters = [...item.latestChapters].sort(
          (a, b) =>
            (new Date(b.createdAt || 0).getTime() || 0) -
            (new Date(a.createdAt || 0).getTime() || 0)
        );

        return {
          manhuaId: item.manhuaId,
          title: item.title,
          slug: item.slug,
          cover: item.cover,
          latestChapters: chapters,
          hasMoreChapters: chapters.length >= 3, // hint for UI
          latestDate: item.latestDate,
        };
      })
      // Sort manhua by newest chapter createdAt DESC
      .sort((a, b) => {
        const aLatest = a.latestChapters[0]?.createdAt;
        const bLatest = b.latestChapters[0]?.createdAt;
        return (
          (new Date(bLatest || 0).getTime() || 0) -
          (new Date(aLatest || 0).getTime() || 0)
        );
      })
      .slice(0, latestUpdatesLimit)
      .map(({ latestDate, ...rest }) => rest);

    res.json({
      hero,
      popularToday,
      latest,
      latestUpdates,
    });
  } catch (err) {
    next(err);
  }
};

function formatTimeAgoSafe(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 🔮 Ирээдүйд нийтлэхээр төлөвлөсөн chapter
  if (diffMs < 0) {
    const futureDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    if (futureDays === 0) return "Soon";
    if (futureDays === 1) return "in 1 day";
    return `in ${futureDays} days`;
  }

  // ⏱ Өнөөдөр, өчигдөр г.м
  if (diffDays === 0) {
    if (diffHours >= 1) return `${diffHours}h ago`;
    if (diffMinutes >= 1) return `${diffMinutes}m ago`;
    return "Just now";
  }

  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}
