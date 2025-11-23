const Favorite = require("../models/Favorite");

// POST /api/me/favorites/:manhuaId
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
    const favorites = await Favorite.find({ user: req.user._id })
      .populate("manhua")
      .lean();

    res.json(favorites);
  } catch (err) {
    next(err);
  }
};
