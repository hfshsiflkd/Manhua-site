// src/controllers/chapterController.js
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const { trackView } = require("../utils/viewCounter");

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

/* =====================================================
   slug -> manhuaId CACHE
===================================================== */
const manhuaIdCache = new Map();

async function getManhuaIdBySlug(slug) {
  const cached = manhuaIdCache.get(slug);
  if (cached) return cached;

  const m = await Manhua.findOne({ slug }).select("_id").lean();
  if (!m) return null;

  manhuaIdCache.set(slug, m._id);
  return m._id;
}

/* =====================================================
   GET /api/manhuas/:slug/chapters/:chapterNumber
   🔥 CACHE + 1 DB AGGREGATE
===================================================== */
exports.getChapter = async (req, res, next) => {
  try {
    const { slug, chapterNumber } = req.params;
    const chNum = Number(chapterNumber);

    if (!Number.isFinite(chNum)) {
      return res.status(400).json({ message: "Invalid chapterNumber" });
    }

    const manhuaId = await getManhuaIdBySlug(slug);
    if (!manhuaId) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // 🔥 CACHE CHECK
    const cacheKey = `${manhuaId}:${chNum}:mn:published`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 🔥 SINGLE DB CALL
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
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const prev = result.prev?.[0] || null;
    const next = result.next?.[0] || null;

    // views (load test үед унтрааж болно)
    if (process.env.DISABLE_VIEWS !== "1") {
      trackView({ chapterId: chapter._id, manhuaId });
    }

    const payload = {
      ...chapter,
      hasPrev: !!prev,
      hasNext: !!next,
      prevChapterNumber: prev ? prev.chapterNumber : null,
      nextChapterNumber: next ? next.chapterNumber : null,
    };

    // 🔥 CACHE SET (60s)
    cacheSet(cacheKey, payload, 60_000);

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
    for (const key of chapterCache.keys()) {
      if (key.startsWith(String(manhua._id))) {
        chapterCache.delete(key);
      }
    }

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
    const chapter = await Chapter.findById(req.params.id)
      .populate("manhua", "title slug coverImage coverImageUrl")
      .lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

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

exports.editorListChaptersOfManhua = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const manhua = await Manhua.findOne({ slug }).lean();
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // admin биш бол зөвхөн өөрийнхөө manhua дээр ажиллах
    if (
      req.user.role !== "admin" &&
      String(manhua.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "No permission for this manhua" });
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
    const chapter = await Chapter.findById(req.params.id)
      .populate("manhua", "title slug createdBy")
      .lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const manhua = chapter.manhua;

    // admin биш бол зөвхөн өөрийн manhua
    if (
      req.user.role !== "admin" &&
      String(manhua.createdBy) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "No permission for this chapter" });
    }

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
    const chapter = await Chapter.findById(req.params.id).populate(
      "manhua",
      "createdBy"
    );

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // admin биш бол зөвхөн өөрийнхөө manhua-ны chapter
    if (
      req.user.role !== "admin" &&
      String(chapter.manhua.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "No permission" });
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

exports.editorCreateChapter = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { chapterNumber, title, pages, language, status } = req.body;

    // Манхуа олох
    const manhua = await Manhua.findOne({ slug }).lean();
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // admin биш бол зөвхөн өөрийнхөө манхуа дээр л chapter үүсгэнэ
    if (
      req.user.role !== "admin" &&
      String(manhua.createdBy) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "No permission to create chapter for this manhua" });
    }

    // ChapterNumber давхацуулахгүй болгож шалгана (хүсвэл авч болно)
    if (chapterNumber != null) {
      const exists = await Chapter.findOne({
        manhua: manhua._id,
        chapterNumber,
        language: language || "mn",
      });

      if (exists) {
        return res
          .status(400)
          .json({ message: "Энэ дугаартай chapter аль хэдийнэ байна." });
      }
    }

    // pages хоосон байж болохоор editor талдаа зөвшөөрөөд үлдээе
    let formattedPages = [];
    if (Array.isArray(pages)) {
      formattedPages = pages.map((p, idx) => ({
        pageNumber: p.pageNumber ?? idx + 1,
        imageUrl: p.imageUrl,
      }));
    }

    const chapter = await Chapter.create({
      manhua: manhua._id,
      chapterNumber,
      title,
      pages: formattedPages,
      language: language || "mn",
      status: status || "draft", // editor талаас draft болгож эхлүүлбэл зүгээр
      views: 0,
      uploadedBy: req.user._id,
    });

    res.status(201).json(chapter);
  } catch (err) {
    next(err);
  }
};
