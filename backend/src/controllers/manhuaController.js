const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

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

    const items = await Manhua.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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
