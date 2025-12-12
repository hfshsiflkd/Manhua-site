const Manhua = require("../models/Manhua");
const cache = require("../utils/cache");

const TTL_MINE = 30_000; // 30s

/**
 * GET /api/editor/manhuas/mine
 */
exports.getMyManhuas = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const cacheKey = `editor:manhuas:mine:${userId}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const manhuas = await Manhua.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    cache.set(cacheKey, manhuas, TTL_MINE);
    res.json(manhuas);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/editor/manhuas
 */
exports.createManhua = async (req, res, next) => {
  try {
    const {
      title,
      description,
      coverImage,
      coverImageUrl,
      slug,
      status,
      genres,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const doc = await Manhua.create({
      title,
      description,
      slug,
      status: status || "ongoing",
      coverImage: coverImage || coverImageUrl,
      coverImageUrl: coverImageUrl || coverImage,
      genres: Array.isArray(genres) ? genres : [],
      createdBy: req.user._id,
    });

    // ✅ cache invalidate (mine list)
    cache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    cache.delPrefix("admin:manhuas:list:");

    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(400).json({
        message: "Энэ slug аль хэдийн ашиглагдсан байна. Өөр slug оруул.",
      });
    }
    next(err);
  }
};

/**
 * PATCH /api/editor/manhuas/:id
 */
exports.updateManhua = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = { _id: id, createdBy: req.user._id };
    if (req.user.role === "admin") query = { _id: id };

    const doc = await Manhua.findOneAndUpdate(query, req.body, {
      new: true,
    }).lean();

    if (!doc) {
      return res
        .status(404)
        .json({ message: "Manhua not found or no permission" });
    }

    // ✅ cache invalidate
    cache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");

    res.json(doc);
  } catch (err) {
    next(err);
  }
};
