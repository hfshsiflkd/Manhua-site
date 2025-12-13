// src/controllers/chapter.public.controller.js
// src/controllers/chapter.public.controller.js
const Chapter = require("../models/Chapter");
const { trackView } = require("../utils/viewCounter");
const { getManhuaIdBySlug } = require("../services/manhua.service");
const { chapterCache, makeChapterKey } = require("../cache/chapterCache");

function computeIsVip(user) {
  if (!user?.vipExpiresAt) return false;
  return new Date(user.vipExpiresAt).getTime() > Date.now();
}

exports.getChapter = async (req, res, next) => {
  try {
    const { slug, chapterNumber } = req.params;
    const chNum = Number(chapterNumber);

    if (!Number.isFinite(chNum)) {
      return res.status(400).json({ message: "Invalid chapterNumber" });
    }

    const manhuaId = await getManhuaIdBySlug(slug);
    if (!manhuaId) return res.status(404).json({ message: "Manhua not found" });

    // ✅ VIP эсэхийг optionalProtect-аас авна
    const isVIP = computeIsVip(req.user);

    // ✅ cache key-г VIP/FREE гэж салгахгүй бол VIP-ийн pages cache-даад FREE-д очно
    const cacheKey = makeChapterKey({
      manhuaId,
      chapterNumber: chNum,
      tier: isVIP ? "vip" : "free",
    });

    const cached = chapterCache.get(cacheKey);
    if (cached) return res.json(cached);

    const [result] = await Chapter.aggregate([
      { $match: { manhua: manhuaId, language: "mn", status: "published" } },
      {
        $facet: {
          current: [{ $match: { chapterNumber: chNum } }, { $limit: 1 }],
          prev: [
            { $match: { chapterNumber: { $lt: chNum } } },
            { $sort: { chapterNumber: -1 } },
            { $limit: 1 },
            { $project: { chapterNumber: 1 } },
          ],
          next: [
            { $match: { chapterNumber: { $gt: chNum } } },
            { $sort: { chapterNumber: 1 } },
            { $limit: 1 },
            { $project: { chapterNumber: 1 } },
          ],
        },
      },
    ]);

    const chapter = result?.current?.[0];
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const prev = result.prev?.[0] || null;
    const next = result.next?.[0] || null;

    if (process.env.DISABLE_VIEWS !== "1") {
      trackView({ chapterId: chapter._id, manhuaId });
    }

    // ✅ pages-ийг default-р битгий тараа!
    const payload = {
      _id: chapter._id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      hasPrev: !!prev,
      hasNext: !!next,
      prevChapterNumber: prev ? prev.chapterNumber : null,
      nextChapterNumber: next ? next.chapterNumber : null,
      // (хүсвэл энд нэмэлт meta: cover, pageCount гэх мэт)
      pageCount: Array.isArray(chapter.pages) ? chapter.pages.length : 0,
    };

    // ✅ зөвхөн VIP үед pages өгнө
    if (isVIP) {
      payload.pages = chapter.pages;
    } else {
      // ⭐ Хэрэв VIP биш бол бүрэн хаахыг хүсвэл:
      // return res.status(403).json({ message: "VIP required", code: "VIP_REQUIRED" });
    }

    chapterCache.set(cacheKey, payload, 60_000);
    return res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.getChaptersOfManhua = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const manhuaId = await getManhuaIdBySlug(slug);
    if (!manhuaId) return res.status(404).json({ message: "Manhua not found" });

    const chapters = await Chapter.find({
      manhua: manhuaId,
      status: "published",
      language: "mn",
    })
      .sort({ chapterNumber: 1 })
      .select("chapterNumber title createdAt updatedAt")
      .lean();

    res.json(chapters);
  } catch (err) {
    next(err);
  }
};
