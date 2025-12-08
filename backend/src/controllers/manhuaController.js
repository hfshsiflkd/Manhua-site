const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

// GET /api/manhuas  (list + search)
// GET /api/manhuas  (list + search)
exports.getManhuas = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const genre = req.query.genre;
    const status = req.query.status;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const filter = {};

    if (q) filter.title = { $regex: q, $options: "i" };
    if (genre) filter.genres = genre;
    if (status) filter.status = status;

    const total = await Manhua.countDocuments(filter);

    const manhuas = await Manhua.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // ✨ manhua бүрийн хамгийн сүүлийн chapter-ийг олоод нэмнэ
    const manhuaIds = manhuas.map((m) => m._id);

    const chapters = await Chapter.aggregate([
      { $match: { manhua: { $in: manhuaIds }, status: "published" } },
      { $sort: { chapterNumber: -1 } },
      {
        $group: {
          _id: "$manhua",
          lastChapterNumber: { $first: "$chapterNumber" },
          lastChapterId: { $first: "$_id" },
          lastChapterAt: { $first: "$createdAt" },
        },
      },
    ]);

    const byManhuaId = new Map(
      chapters.map((c) => [String(c._id), c])
    );

    const items = manhuas.map((m) => {
      const extra = byManhuaId.get(String(m._id));
      return {
        ...m,
        lastChapterNumber: extra?.lastChapterNumber || null,
        lastChapterId: extra?.lastChapterId || null,
        lastChapterAt: extra?.lastChapterAt || null,
      };
    });

    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
};

// GET /api/manhuas/:slug
exports.getManhuaBySlug = async (req, res, next) => {
  try {
    const manhua = await Manhua.findOne({ slug: req.params.slug });
    if (!manhua) {
      return res.status(404).json({ message: "Манхуа олдсонгүй" });
    }
    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

// ADMIN — CREATE
exports.createManhua = async (req, res, next) => {
  try {
    const manhua = await Manhua.create(req.body);
    res.status(201).json(manhua);
  } catch (err) {
    next(err);
  }
};

// ADMIN — UPDATE
exports.updateManhua = async (req, res, next) => {
  try {
    const manhua = await Manhua.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    );
    if (!manhua) {
      return res.status(404).json({ message: "Манхуа олдсонгүй" });
    }
    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

// ADMIN — DELETE
exports.deleteManhua = async (req, res, next) => {
  try {
    const manhua = await Manhua.findOneAndDelete({ slug: req.params.slug });
    if (!manhua) {
      return res.status(404).json({ message: "Манхуа олдсонгүй" });
    }
    res.json({ message: "Устгагдлаа" });
  } catch (err) {
    next(err);
  }
};
