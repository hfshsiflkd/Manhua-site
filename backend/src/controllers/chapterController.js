const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

// =====================================
// PUBLIC: GET /api/manhuas/:slug/chapters
// =====================================
exports.getChaptersOfManhua = async (req, res, next) => {
  try {
    const manhua = await Manhua.findOne({ slug: req.params.slug });
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    const chapters = await Chapter.find({
      manhua: manhua._id,
      status: "published",
    })
      .sort({ chapterNumber: 1 })
      .lean();

    res.json(chapters);
  } catch (err) {
    next(err);
  }
};

// =====================================
// PUBLIC: GET /api/manhuas/:slug/chapters/:chapterNumber
// =====================================
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

    // view counter (async)
    Chapter.updateOne(
      { _id: chapter._id },
      { $inc: { views: 1 } }
    ).catch(() => {});

    Manhua.updateOne(
      { _id: manhua._id },
      { $inc: { views: 1 } }
    ).catch(() => {});

    res.json(chapter);
  } catch (err) {
    next(err);
  }
};

// =====================================
// ADMIN: POST /api/manhuas/:slug/chapters
// (multi-page create)
// =====================================
exports.createChapter = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { chapterNumber, title, pages, language, status } = req.body;

    const manhua = await Manhua.findOne({ slug });
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

// =====================================
// ADMIN: GET /api/chapters/:id
// =====================================
exports.getChapterById = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate("manhua", "title slug coverImageUrl")
      .lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    res.json(chapter);
  } catch (err) {
    next(err);
  }
};

// =====================================
// ADMIN: PUT /api/chapters/:id
// =====================================
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

    if (Array.isArray(pages)) {
      chapter.pages = pages;
    }

    await chapter.save();
    res.json(chapter);
  } catch (err) {
    next(err);
  }
};
