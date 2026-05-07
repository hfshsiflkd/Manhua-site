const Favorite = require("../models/Favorite");
const Manhua = require("../models/Manhua");
const redisCache = require("../cache/redisCache");

const favCacheKey = (userId) => `user:favorites:${userId}`;

// POST /api/me/favorites/:manhuaId (toggle)
exports.toggleFavorite = async (req, res, next) => {
  try {
    const { manhuaId } = req.params;

    // Verify manhua exists
    const manhua = await Manhua.findById(manhuaId);
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      user: req.user._id,
      manhua: manhuaId,
    });

    if (existing) {
      await Favorite.findOneAndDelete({ user: req.user._id, manhua: manhuaId });
      redisCache.del(favCacheKey(req.user._id)).catch(() => {});
      return res.json({ isFavorited: false, message: "Favorite removed" });
    } else {
      const fav = await Favorite.create({ user: req.user._id, manhua: manhuaId });
      redisCache.del(favCacheKey(req.user._id)).catch(() => {});
      return res.json({ isFavorited: true, favorite: fav });
    }
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key - already exists, remove it
      await Favorite.findOneAndDelete({
        user: req.user._id,
        manhua: req.params.manhuaId,
      });
      return res.json({ isFavorited: false, message: "Favorite removed" });
    }
    next(err);
  }
};

// POST /api/me/favorites/:manhuaId (legacy - keep for backward compatibility)
exports.addFavorite = async (req, res, next) => {
  try {
    const { manhuaId } = req.params;

    const fav = await Favorite.findOneAndUpdate(
      { user: req.user._id, manhua: manhuaId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(fav);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: "Already favorite" });
    }
    next(err);
  }
};

// DELETE /api/me/favorites/:manhuaId
exports.removeFavorite = async (req, res, next) => {
  try {
    const { manhuaId } = req.params;

    await Favorite.findOneAndDelete({
      user: req.user._id,
      manhua: manhuaId,
    });

    res.json({ message: "Favorite removed" });
  } catch (err) {
    next(err);
  }
};

// GET /api/me/favorites
exports.getMyFavorites = async (req, res, next) => {
  try {
    const cKey = favCacheKey(req.user._id || req.user.id);
    const cached = await redisCache.get(cKey);
    if (cached) return res.json(cached);

    const favorites = await Favorite.find({ user: req.user._id || req.user.id })
      .populate("manhua", "title slug coverImageUrl coverImage")
      .lean();

    redisCache.set(cKey, favorites, 60).catch(() => {}); // 1 мин
    res.json(favorites);
  } catch (err) {
    next(err);
  }
};
