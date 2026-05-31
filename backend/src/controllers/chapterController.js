// src/controllers/chapterController.js
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const Team = require("../models/Team");
const { trackView } = require("../utils/viewCounter");
const { invalidatePublicManhuaCache } = require("../utils/invalidatePublicManhuaCache");
const { signPages } = require("../utils/signPages");

/* =====================================================
   🔥 IN-MEMORY CACHE (60 секунд)
===================================================== */
const chapterCache = new Map(); // key -> { data, exp }

function cacheGet(key) {
  const v = chapterCache.get(key);
  if (!v) return null;
  if (Date.now() > v.exp) {
    chapterCache.delete(key);
    return null;
  }
  return v.data;
}

function cacheSet(key, data, ttlMs = 60_000) {
  chapterCache.set(key, {
    data,
    exp: Date.now() + ttlMs,
  });
}

function invalidateChapterCache(manhuaId) {
  if (!manhuaId) return;
  for (const key of chapterCache.keys()) {
    if (key.startsWith(String(manhuaId))) {
      chapterCache.delete(key);
    }
  }
}

async function getTeamRole(teamId, userId) {
  const normalizedId =
    typeof teamId === "object" && teamId !== null
      ? teamId._id || teamId.id
      : teamId;
  if (!normalizedId) return null;
  const team = await Team.findById(normalizedId).select("members").lean();
  if (!team) return null;
  const member = team.members?.find(
    (m) => String(m.user) === String(userId)
  );
  return member?.role || null;
}

function hasTeamAccess(role) {
  return role === "owner" || role === "admin" || role === "editor";
}

// Манхуагийн эзэмшигч мөн эсэхийг шалгана: createdBy эсвэл owners массив дотор байна уу
function isManhuaOwner(manhua, userId) {
  if (!manhua || !userId) return false;
  const uid = String(userId);
  if (String(manhua.createdBy) === uid) return true;
  if (Array.isArray(manhua.owners)) {
    return manhua.owners.some((o) => String(o) === uid);
  }
  return false;
}

/* =====================================================
   slug -> manhuaId CACHE (max 500 entry, LRU-light)
===================================================== */
const SLUG_CACHE_MAX = 500;
const manhuaIdCache = new Map();

async function getManhuaIdBySlug(slug) {
  const cached = manhuaIdCache.get(slug);
  if (cached) return cached;

  const m = await Manhua.findOne({ slug }).select("_id").lean();
  if (!m) return null;

  if (manhuaIdCache.size >= SLUG_CACHE_MAX) {
    manhuaIdCache.delete(manhuaIdCache.keys().next().value);
  }
  manhuaIdCache.set(slug, m._id);
  return m._id;
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

/* =====================================================
   GET /api/manhuas/:slug/chapters/:chapterNumber
   🔥 CACHE + 1 DB AGGREGATE
===================================================== */
// GET /api/manhuas/:slug/chapters/:chapterNumber
exports.getChapter = async (req, res, next) => {
  try {
    const { slug, chapterNumber } = req.params;
    const chNum = Number(chapterNumber);
    if (!Number.isFinite(chNum)) {
      return res.status(400).json({ message: "Invalid chapterNumber" });
    }

    const manhuaId = await getManhuaIdBySlug(slug);
    if (!manhuaId) return res.status(404).json({ message: "Manhua not found" });

    const user = req.user;

    const isVIP =
      user?.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > Date.now();

    if (!isVIP) {
      // ❌ VIP биш → шууд хаана
      return res.status(403).json({
        message: "VIP required",
        code: "VIP_REQUIRED",
      });
    }

    // ✅ cacheKey-д vip/free ялгалт
    const cacheKey = `${manhuaId}:${chNum}:mn:published:${isVIP ? "vip" : "free"}`;

    const cached = cacheGet(cacheKey);
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

    // VIP-д буцаах pages-ийг R2 signed URL болгоно (private bucket)
    const signedPages = isVIP ? await signPages(chapter.pages) : undefined;

    // ✅ Үндсэн payload (pages байхгүй)
    const payload = {
      _id: chapter._id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      hasPrev: !!prev,
      hasNext: !!next,
      prevChapterNumber: prev ? prev.chapterNumber : null,
      nextChapterNumber: next ? next.chapterNumber : null,
      // pages: зөвхөн VIP үед л нэмнэ
      ...(isVIP ? { pages: signedPages } : {}),
    };

    // 🔥 Зөвлөмж: VIP payload-ийг cache хийхгүй байвал бүр найдвартай
    // cacheSet(cacheKey, payload, 60_000);

    // ✅ Харин ингэвэл safe: free-г л cache хийнэ
    if (!isVIP) cacheSet(cacheKey, payload, 60_000);

    return res.json(payload);
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   GET /api/manhuas/:slug/chapters
   (pages БИШ, зөвхөн list)
===================================================== */
exports.getChaptersOfManhua = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const manhuaId = await getManhuaIdBySlug(slug);
    if (!manhuaId) {
      return res.status(404).json({ message: "Manhua not found" });
    }

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

/* =====================================================
   🔹 Helper – slug эсвэл ID
===================================================== */
async function findManhuaBySlugOrId(slugOrId) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(slugOrId);
  if (isObjectId) {
    const byId = await Manhua.findById(slugOrId);
    if (byId) return byId;
  }
  return Manhua.findOne({ slug: slugOrId });
}

/* =====================================================
   ADMIN / EDITOR (ТАНЫХ ХЭВЭЭР)
===================================================== */
exports.adminListChaptersOfManhua = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const manhua = await findManhuaBySlugOrId(slug);
    if (!manhua) return res.status(404).json({ message: "Manhua not found" });

    const chapters = await Chapter.find({ manhua: manhua._id })
      .sort({ chapterNumber: 1 })
      .lean();

    res.json(chapters);
  } catch (err) {
    next(err);
  }
};

exports.createChapter = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { chapterNumber, title, pages, language, status } = req.body;

    const manhua = await findManhuaBySlugOrId(slug);
    if (!manhua) {
      return res.status(404).json({ message: "Манхуа олдсонгүй" });
    }

    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ message: "Pages массив хоосон байна" });
    }

    const formattedPages = pages.map((p, idx) => ({
      pageNumber: p.pageNumber ?? idx + 1,
      imageUrl: p.imageUrl,
      originalName: p.originalName || null,
    }));

    const chapter = await Chapter.create({
      manhua: manhua._id,
      chapterNumber,
      title,
      pages: formattedPages,
      language: language || "mn",
      status: status || "published",
      views: 0,
    });

    // 🔥 cache invalidate (энэ манхуатай холбоотой)
    invalidateChapterCache(manhua._id);

    res.status(201).json(chapter);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/chapters/:id
 * – Admin: нэг chapter-ийг ID-гаар нь авах
 */
exports.getChapterById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid chapter id" });
    const chapter = await Chapter.findById(req.params.id)
      .populate("manhua", "title slug coverImage coverImageUrl")
      .lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    chapter.pages = await signPages(chapter.pages);
    res.json(chapter);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/chapters/:id
 * – Admin: chapter update (гарчиг, номер, статус, pages)
 */
exports.updateChapter = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid chapter id" });
    const { chapterNumber, title, status, pages } = req.body;

    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    if (chapterNumber !== undefined) chapter.chapterNumber = chapterNumber;
    if (title !== undefined) chapter.title = title;
    if (status !== undefined) chapter.status = status;
    if (Array.isArray(pages)) chapter.pages = pages;

    await chapter.save();
    res.json(chapter);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/chapters/:id
 * – Admin: chapter устгах (ID-гаар)
 */
exports.adminDeleteChapter = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid chapter id" });

    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const manhuaId = chapter.manhua;
    // 🗑️ Soft delete
    chapter.deletedAt = new Date();
    chapter.deletedBy = req.user._id;
    await chapter.save();
    invalidateChapterCache(manhuaId);
    await invalidatePublicManhuaCache();

    res.json({ message: "Chapter moved to trash" });
  } catch (err) {
    next(err);
  }
};

exports.editorListChaptersOfManhua = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const manhua = await Manhua.findOne({ slug }).lean();
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // admin бол бүгдэд, editor/translator зөвхөн өөрийнх эсвэл багийнх
    if (req.user.role !== "admin") {
      const isOwner = isManhuaOwner(manhua, req.user._id);
      const teamRole = await getTeamRole(manhua.team, req.user._id);
      if (!isOwner && !hasTeamAccess(teamRole)) {
        return res.status(403).json({ message: "No permission for this manhua" });
      }
    }

    const chapters = await Chapter.find({ manhua: manhua._id })
      .sort({ chapterNumber: 1 })
      .lean();

    res.json(chapters);
  } catch (err) {
    next(err);
  }
};

/**
 * EDITOR: GET /api/editor/chapters/:id
 * - Chapter-ийн мэдээлэл (зөвхөн owner эсвэл admin)
 */
exports.editorGetChapterById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid chapter id" });
    const chapter = await Chapter.findById(req.params.id)
      .populate("manhua", "title slug createdBy owners team")
      .lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const manhua = chapter.manhua;

    // admin бол бүгдэд, editor/translator зөвхөн өөрийнх эсвэл багийнх
    if (req.user.role !== "admin") {
      const isOwner = isManhuaOwner(manhua, req.user._id);
      const teamRole = await getTeamRole(manhua.team, req.user._id);
      if (!isOwner && !hasTeamAccess(teamRole)) {
        return res
          .status(403)
          .json({ message: "No permission for this chapter" });
      }
    }

    // Editor засах үед ч signed URL ашиглана
    chapter.pages = await signPages(chapter.pages);
    res.json(chapter);
  } catch (err) {
    next(err);
  }
};

/**
 * EDITOR: PUT /api/editor/chapters/:id
 * - Page, title, status зэргийг шинэчлэх (owner + admin)
 */
exports.editorUpdateChapter = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid chapter id" });
    const chapter = await Chapter.findById(req.params.id).populate(
      "manhua",
      "createdBy owners team"
    );

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // admin бол бүгдэд, editor/translator зөвхөн өөрийнх эсвэл багийнх
    if (req.user.role !== "admin") {
      const isOwner = isManhuaOwner(chapter.manhua, req.user._id);
      const teamRole = await getTeamRole(chapter.manhua.team, req.user._id);
      if (!isOwner && !hasTeamAccess(teamRole)) {
        return res.status(403).json({ message: "No permission" });
      }
    }

    const { chapterNumber, title, status, pages } = req.body;

    if (chapterNumber !== undefined) chapter.chapterNumber = chapterNumber;
    if (title !== undefined) chapter.title = title;
    if (status !== undefined) chapter.status = status;
    if (Array.isArray(pages)) chapter.pages = pages;

    await chapter.save();
    res.json(chapter);
  } catch (err) {
    next(err);
  }
};

/**
 * EDITOR: DELETE /api/editor/chapters/:id
 * - Chapter устгах (owner + admin)
 */
exports.editorDeleteChapter = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid chapter id" });

    const chapter = await Chapter.findById(req.params.id).populate(
      "manhua",
      "createdBy owners team"
    );

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // admin бол бүгдэд, editor/translator зөвхөн өөрийнх эсвэл багийнх
    if (req.user.role !== "admin") {
      const isOwner = isManhuaOwner(chapter.manhua, req.user._id);
      const teamRole = await getTeamRole(chapter.manhua.team, req.user._id);
      if (!isOwner && !hasTeamAccess(teamRole)) {
        return res.status(403).json({ message: "Only owner can delete" });
      }
    }

    const manhuaId = chapter.manhua?._id || chapter.manhua;
    // 🗑️ Soft delete
    chapter.deletedAt = new Date();
    chapter.deletedBy = req.user._id;
    await chapter.save();
    invalidateChapterCache(manhuaId);
    await invalidatePublicManhuaCache();

    res.json({ message: "Chapter moved to trash" });
  } catch (err) {
    next(err);
  }
};

exports.editorCreateChapter = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { chapterNumber, title, pages, language, status } = req.body;

    const manhua = await Manhua.findOne({ slug }).lean();
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    if (req.user.role !== "admin") {
      const isOwner = isManhuaOwner(manhua, req.user._id);
      const teamRole = await getTeamRole(manhua.team, req.user._id);
      if (!isOwner && !hasTeamAccess(teamRole)) {
        return res
          .status(403)
          .json({ message: "No permission to create chapter for this manhua" });
      }
    }

    if (chapterNumber != null) {
      const exists = await Chapter.findOne({
        manhua: manhua._id,
        chapterNumber,
        language: language || "mn",
      });
      if (exists) {
        return res
          .status(409)
          .json({ message: "Энэ дугаартай chapter аль хэдийн байна." });
      }
    }

    let formattedPages = [];
    if (Array.isArray(pages)) {
      formattedPages = pages.map((p, idx) => ({
        pageNumber: p.pageNumber ?? idx + 1,
        imageUrl: p.imageUrl,
        originalName: p.originalName || null,
      }));
    }

    try {
      const chapter = await Chapter.create({
        manhua: manhua._id,
        chapterNumber,
        title,
        pages: formattedPages,
        language: language || "mn",
        status: status || "draft",
        views: 0,
        uploadedBy: req.user._id,
      });
      res.status(201).json(chapter);
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({
          message: "Энэ дугаартай chapter аль хэдийн байна. Өөр дугаар сонгоно уу.",
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};
