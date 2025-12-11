// src/controllers/chapterController.js
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

// 🔹 Helper – slug ИЛҮҮД ID-ээр хайдаг болгочихъё
async function findManhuaBySlugOrId(slugOrId) {
  // 24 урттай hex бол _id байх магадлалтай
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(slugOrId);

  if (isObjectId) {
    const byId = await Manhua.findById(slugOrId);
    if (byId) return byId;
  }

  // slug-р хайна
  return Manhua.findOne({ slug: slugOrId });
}

/* ---------------------- PUBLIC ROUTES ---------------------- */
/**
 * GET /api/manhuas/:slug/chapters
 * – Уншигч тал: зөвхөн published + mn language
 */
exports.getChaptersOfManhua = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const manhua = await Manhua.findOne({ slug });
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    const chapters = await Chapter.find({
      manhua: manhua._id,
      status: "published",
      language: "mn",
    })
      .sort({ chapterNumber: 1 })
      .lean();

    res.json(chapters);
  } catch (err) {
    next(err);
  }
};

exports.getChapter = async (req, res, next) => {
  try {
    const { slug, chapterNumber } = req.params;

    const manhua = await Manhua.findOne({ slug });
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    const chapter = await Chapter.findOne({
      manhua: manhua._id,
      chapterNumber: Number(chapterNumber),
      language: "mn",
      status: "published",
    }).lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // 🔹 Өмнөх ба дараагийн chapter-уудыг олно
    const [prevChapter, nextChapter] = await Promise.all([
      Chapter.findOne({
        manhua: manhua._id,
        language: "mn",
        status: "published",
        chapterNumber: { $lt: chapter.chapterNumber },
      })
        .sort({ chapterNumber: -1 }) // хамгийн сүүлийн өмнөх
        .select("chapterNumber")
        .lean(),
      Chapter.findOne({
        manhua: manhua._id,
        language: "mn",
        status: "published",
        chapterNumber: { $gt: chapter.chapterNumber },
      })
        .sort({ chapterNumber: 1 }) // дараагийн хамгийн эхний
        .select("chapterNumber")
        .lean(),
    ]);

    const extendedChapter = {
      ...chapter,
      hasPrev: !!prevChapter,
      hasNext: !!nextChapter,
      prevChapterNumber: prevChapter ? prevChapter.chapterNumber : null,
      nextChapterNumber: nextChapter ? nextChapter.chapterNumber : null,
    };

    // view counter (async)
    Chapter.updateOne({ _id: chapter._id }, { $inc: { views: 1 } }).catch(
      () => {}
    );

    Manhua.updateOne({ _id: manhua._id }, { $inc: { views: 1 } }).catch(
      () => {}
    );

    // 🔹 Одоо front руу prev/next инфо-той нь явна
    res.json(extendedChapter);
  } catch (err) {
    next(err);
  }
};
exports.adminListChaptersOfManhua = async (req, res, next) => {
  try {
    const { slug } = req.params; // энд slug || id байж болно

    const manhua = await findManhuaBySlugOrId(slug);
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
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
 * POST /api/admin/manhuas/:slug/chapters
 * – Шинэ chapter (олон page) үүсгэх
 */
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
