// src/controllers/chapter.public.controller.js
const Chapter = require("../models/Chapter");
const { logAudit } = require("../utils/auditLogger");
const { getManhuaIdBySlug } = require("../services/manhua.service");
const { chapterCache } = require("../cache/chapterCache");
const AppSetting = require("../models/AppSetting");
const redisCache = require("../cache/redisCache");

const FREE_READ_CACHE_KEY = "setting:freeReadMode";

async function isFreeReadActive() {
  const cached = await redisCache.get(FREE_READ_CACHE_KEY);
  if (cached !== null) return cached;

  const doc = await AppSetting.findOne({ key: "freeReadMode" });
  const setting = doc?.value || { enabled: false, expiresAt: null };
  const active =
    setting.enabled &&
    (!setting.expiresAt || new Date(setting.expiresAt).getTime() > Date.now());

  redisCache.set(FREE_READ_CACHE_KEY, active, 30).catch(() => {});
  return active;
}

function computeIsVip(user) {
  if (!user?.vipExpiresAt) return false;
  return new Date(user.vipExpiresAt).getTime() > Date.now();
}

// cache key reflects actual access level (full vs restricted)
function makePublicChapterCacheKey({ manhuaId, chapterNumber, full }) {
  return `${manhuaId.toString()}:ch:${Number(chapterNumber)}:tier:${
    full ? "full" : "free"
  }`;
}

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

    const cacheKey = makePublicChapterCacheKey({
      manhuaId,
      chapterNumber: chNum,
      full: canAccessPages,
    });

    const cached = chapterCache.get(cacheKey);
    if (cached) return res.json(cached);

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
