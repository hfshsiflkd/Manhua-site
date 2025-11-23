const Comment = require("../models/Comment");

// GET /api/chapters/:chapterId/comments
exports.getComments = async (req, res, next) => {
  try {
    const { chapterId } = req.params;

    const comments = await Comment.find({ chapter: chapterId })
      .sort({ createdAt: -1 })
      .populate("user", "username avatarUrl")
      .lean();

    res.json(comments);
  } catch (err) {
    next(err);
  }
};

// POST /api/chapters/:chapterId/comments
exports.createComment = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const { content } = req.body;

    const comment = await Comment.create({
      chapter: chapterId,
      user: req.user._id,
      content,
    });

    const populated = await comment.populate("user", "username avatarUrl");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/comments/:id
exports.deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment)
      return res.status(404).json({ message: "Comment not found" });

    if (
      comment.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await comment.deleteOne();

    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
};
