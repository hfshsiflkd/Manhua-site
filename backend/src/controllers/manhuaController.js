// src/controllers/manhuaController.js
const {
  fetchManhuaList,
  fetchManhuaBySlug,
} = require("../services/manhuaService");

const { parsePagination } = require("../utils/pagination");
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

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

    const popularToday = await Manhua.find({})
      .sort({ dailyViews: -1 })
      .limit(POPULAR_LIMIT)
      .select("title slug coverImageUrl coverImage rating latestChapterNumber")
      .lean();

    const latest = await Manhua.find({})
      .sort({ updatedAt: -1 })
      .limit(LATEST_LIMIT)
      .select("title slug coverImageUrl coverImage rating updatedAt")
      .lean();

    // 🔥 Latest updates
    const latestChapters = await Chapter.find({
      status: "published", // хэрвээ ийм талбар байвал нээгээд хэрэглэ
    })
      .sort({ publicAt: -1, createdAt: -1 }) // хамгийн сүүлд нийтлэгдсэнээс нь эхлүүлнэ
      .limit(LATEST_UPDATES_LIMIT * 3) // нэг манхуагаас хэд хэдэн chapter авах тул жаахан их аваад байна
      .populate({
        path: "manhua", // schema дээр чинь юу гэдэг бол тэрийгээ бич (manhua / manhuaId / series г.м)
        select: "title slug coverImageUrl coverImage rating updatedAt",
      })
      .lean();

    const updatesMap = new Map();

    for (const ch of latestChapters) {
      if (!ch.manhua) continue;

      const key = ch.manhua._id.toString();

      const baseDate = ch.publicAt || ch.createdAt || ch.updatedAt;
      if (!baseDate) continue;

      if (!updatesMap.has(key)) {
        updatesMap.set(key, {
          manhuaId: key,
          title: ch.manhua.title,
          slug: ch.manhua.slug,
          cover: ch.manhua.coverImageUrl || ch.manhua.coverImage || null,
          latestDate: new Date(baseDate).getTime(),
          chapters: [],
        });
      }

      const group = updatesMap.get(key);

      const ts = new Date(baseDate).getTime();
      if (ts > group.latestDate) {
        group.latestDate = ts;
      }

      if (group.chapters.length < 3) {
        // ⬇️ ЭНЭ ХЭСГИЙГ Л СОЛЬЖ БАЙНА
        const chapterNumber =
          ch.chapterNumber ??
          (typeof ch.number === "number" ? ch.number : undefined);

        const chapterLabel =
          chapterNumber != null
            ? `Chapter. ${chapterNumber}${ch.name ? ` - ${ch.name}` : ""}`
            : ch.name || ch.title || "Chapter";

        group.chapters.push({
          name: chapterLabel,
          time: formatTimeAgoSafe(baseDate),
          upcoming: !!ch.isScheduled,
        });
      }
    }

    // Map -> массив, дараа нь хамгийн сүүлийн update-ийн огноогоор нь эрэмбэлнэ
    let latestUpdates = Array.from(updatesMap.values())
      .sort((a, b) => b.latestDate - a.latestDate) // 🕒 хамгийн сүүлд update-лагдсан манхуа дээрээс нь
      .slice(0, LATEST_UPDATES_LIMIT); // эцсийн тоог хязгаарлах

    // latestDate-г фронт руу явуулах шаардлагагүй бол устгаж болно
    latestUpdates = latestUpdates.map(({ latestDate, ...rest }) => rest);

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