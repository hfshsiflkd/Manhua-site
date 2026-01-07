// src/controllers/chapter.public.controller.js
const Chapter = require("../models/Chapter");
const { logAudit } = require("../utils/auditLogger");
const { getManhuaIdBySlug } = require("../services/manhua.service");
const { chapterCache } = require("../cache/chapterCache");

function computeIsVip(user) {
  if (!user?.vipExpiresAt) return false;
  return new Date(user.vipExpiresAt).getTime() > Date.now();
}

// ✅ cache key: VIP/FREE заавал салгаж өгнө
function makePublicChapterCacheKey({ manhuaId, chapterNumber, isVIP }) {
  return `${manhuaId.toString()}:ch:${Number(chapterNumber)}:tier:${
    isVIP ? "vip" : "free"
  }`;
}

exports.getChapter = async (req, res, next) => {
  try {
    const { slug, chapterNumber } = req.params;
    const chNum = Number(chapterNumber);

    if (!Number.isFinite(chNum) || chNum <= 0) {
      return res.status(400).json({ message: "Invalid chapterNumber" });
    }

    const manhuaId = await getManhuaIdBySlug(slug);
    if (!manhuaId) return res.status(404).json({ message: "Manhua not found" });

    // ✅ optionalProtect-аас ирсэн user дээр үндэслэнэ
    const isVIP = computeIsVip(req.user);

    const cacheKey = makePublicChapterCacheKey({
      manhuaId,
      chapterNumber: chNum,
      isVIP,
    });

    const cached = chapterCache.get(cacheKey);
    if (cached) return res.json(cached);

    const [result] = await Chapter.aggregate([
      {
        $match: {
          manhua: manhuaId,
          language: "mn",
          status: "published",
        },
      },
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

    // Log chapter view
    if (req.audit) {
      logAudit(req, {
        level: "INFO",
        category: "reader",
        action: "chapter_view",
        message: `Chapter viewed: ${slug} - Chapter ${chNum}`,
        meta: {
          slug,
          chapterNumber: chNum,
          isVIP,
          hasPages: isVIP && Array.isArray(chapter.pages),
        },
      });
    }

    // ✅ pages-ийг default-р БҮҮ явуул
    const payload = {
      _id: chapter._id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,

      hasPrev: !!prev,
      hasNext: !!next,
      prevChapterNumber: prev ? prev.chapterNumber : null,
      nextChapterNumber: next ? next.chapterNumber : null,

      pageCount: Array.isArray(chapter.pages) ? chapter.pages.length : 0,
    };

    // ✅ зөвхөн VIP үед pages өгнө
    if (isVIP) {
      payload.pages = chapter.pages;
    } else {
      // 🔒 Хэрвээ FREE хэрэглэгчийг бүрэн хаахыг хүсвэл uncomment хийнэ:
      // return res
      //   .status(403)
      //   .json({ message: "VIP required", code: "VIP_REQUIRED" });
    }

    // ✅ safety: ямар нэг merge/old cache-н нөлөө байвал pages-г хүчээр арилгана
    if (!isVIP && "pages" in payload) {
      delete payload.pages;
    }

    // ✅ cache 60s
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

    return res.json(chapters);
  } catch (err) {
    next(err);
  }
};
