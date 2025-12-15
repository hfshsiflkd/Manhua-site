const Bookmark = require("../models/Bookmark");
const Manhua = require("../models/Manhua");

// POST /api/me/bookmarks/:manhuaId (toggle bookmark)
// Note: This uses the Bookmark model which tracks reading progress.
// Toggling off will remove the bookmark (and reading progress).
exports.toggleBookmark = async (req, res, next) => {
  try {
    const { manhuaId } = req.params;

    // Verify manhua exists
    const manhua = await Manhua.findById(manhuaId);
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // Check if already bookmarked
    const existing = await Bookmark.findOne({
      user: req.user._id,
      manhua: manhuaId,
    });

    if (existing) {
      // Remove bookmark (this will also remove reading progress)
      await Bookmark.findOneAndDelete({
        user: req.user._id,
        manhua: manhuaId,
      });
      return res.json({ isBookmarked: false, message: "Bookmark removed" });
    } else {
      // Create a bookmark entry (with default chapter/page for "save for later")
      const bookmark = await Bookmark.create({
        user: req.user._id,
        manhua: manhuaId,
        chapterNumber: 1,
        pageNumber: 1,
      });
      return res.json({ isBookmarked: true, bookmark });
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/me/bookmarks (set reading bookmark - existing functionality)
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
