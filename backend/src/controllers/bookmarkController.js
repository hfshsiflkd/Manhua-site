const Bookmark = require("../models/Bookmark");

// POST /api/me/bookmarks
exports.setBookmark = async (req, res, next) => {
  try {
    const { manhuaId, chapterNumber, pageNumber } = req.body;

    const bookmark = await Bookmark.findOneAndUpdate(
      { user: req.user._id, manhua: manhuaId },
      { chapterNumber, pageNumber },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(bookmark);
  } catch (err) {
    next(err);
  }
};

// GET /api/me/bookmarks
exports.getMyBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user._id })
      .populate("manhua")
      .lean();

    res.json(bookmarks);
  } catch (err) {
    next(err);
  }
};
