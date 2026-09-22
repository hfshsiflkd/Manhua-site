// src/controllers/chapter.public.controller.js
const Chapter = require("../models/Chapter");
const { logAudit } = require("../utils/auditLogger");
const { getManhuaIdBySlug } = require("../services/manhua.service");
const {
  getPublicChapter,
  setPublicChapter,
} = require("../services/chapterReadCache");
const { isFreeReadActive, resolveFreeRead } = require("../utils/freeRead");

function computeIsVip(user) {
  if (!user?.vipExpiresAt) return false;
  return new Date(user.vipExpiresAt).getTime() > Date.now();
}

// cache key reflects actual access level (full vs restricted)
exports.resolveFreeRead = resolveFreeRead;

exports.getChapter = async (req, res, next) => {
  try {
    const { slug, chapterNumber } = req.params;
    const chNum = Number(chapterNumber);

    if (!Number.isFinite(chNum) || chNum < 0) {
      return res.status(400).json({ message: "Invalid chapterNumber" });
    }

    const manhuaId = await getManhuaIdBySlug(slug);
    if (!manhuaId) return res.status(404).json({ message: "Manhua not found" });

    // optionalProtect-аас ирсэн user + global free read mode
    const isVIP = computeIsVip(req.user);
    const freeRead = await isFreeReadActive();
    const canAccessPages = isVIP || freeRead;

    const cached = await getPublicChapter(manhuaId, chNum, canAccessPages ? "full" : "free");
    if (cached) {
      if (cached.status && cached.status !== "published") {
        return res.status(404).json({ message: "Chapter not found" });
      }
      return res.json(cached);
    }

    const [result] = await Chapter.aggregate([
      {
        $match: {
          manhua: manhuaId,
          language: "mn",
          status: "published",
          deletedAt: null,
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
          freeRead,
          hasPages: canAccessPages && Array.isArray(chapter.pages),
        },
      });
    }

    // ✅ pages-ийг default-р БҮҮ явуул
    const payload = {
      _id: chapter._id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      status: "published",

      hasPrev: !!prev,
      hasNext: !!next,
      prevChapterNumber: prev ? prev.chapterNumber : null,
      nextChapterNumber: next ? next.chapterNumber : null,

      pageCount: Array.isArray(chapter.pages) ? chapter.pages.length : 0,
    };

    // VIP эсвэл free read mode идэвхтэй үед pages өгнө
    // Bucket public тул pub URL-ийг шууд буцаана (signed URL expire асуудалгүй)
    if (canAccessPages) {
      payload.pages = chapter.pages.map(({ pageNumber, imageUrl }) => ({ pageNumber, imageUrl }));
    }

    // safety: хандах эрхгүй үед pages байвал арилгана
    if (!canAccessPages && "pages" in payload) {
      delete payload.pages;
    }

    // pub URL expire болохгүй тул cache илүү удаан байж болно
    await setPublicChapter(manhuaId, chNum, canAccessPages ? "full" : "free", payload, 60);
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
