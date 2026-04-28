// src/controllers/commentController.js
const Comment = require("../models/Comment");
const Manhua = require("../models/Manhua");
const { logAudit } = require("../utils/auditLogger");

const mongoose = require("mongoose");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/comments/manhua/:manhuaId?page=1&limit=20
// List comments for a manhua (newest first)
exports.getManhuaComments = async (req, res, next) => {
  try {
    const { manhuaId } = req.params;
    if (!isValidId(manhuaId)) {
      return res.status(400).json({ success: false, message: "Manhua ID буруу байна" });
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    // Verify manhua exists
    const manhua = await Manhua.findById(manhuaId);
    if (!manhua) {
      return res.status(404).json({
        success: false,
        message: "Manhua олдсонгүй"
      });
    }

    // Get comments with pagination
    const query = { manhua: manhuaId };
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .select("_id user username text createdAt updatedAt")
      .lean();

    const total = await Comment.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/comments/manhua/:manhuaId
// Create a comment for a manhua
exports.createManhuaComment = async (req, res, next) => {
  try {
    const { manhuaId } = req.params;
    if (!isValidId(manhuaId)) {
      return res.status(400).json({ success: false, message: "Manhua ID буруу байна" });
    }
    let { text } = req.body;

    // Validate text
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        success: false,
        message: "Сэтгэгдэл шаардлагатай",
        code: "MISSING_TEXT"
      });
    }

    text = text.trim();

    if (text.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Сэтгэгдэл хоосон байж болохгүй",
        code: "EMPTY_TEXT"
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Сэтгэгдэл 500 тэмдэгтээс их байж болохгүй",
        code: "TEXT_TOO_LONG"
      });
    }

    // Verify manhua exists
    const manhua = await Manhua.findById(manhuaId);
    if (!manhua) {
      return res.status(404).json({
        success: false,
        message: "Manhua олдсонгүй"
      });
    }

    // Create comment
    const comment = await Comment.create({
      user: req.user._id,
      username: req.user.username, // Snapshot
      manhua: manhuaId,
      text
    });

    // Log comment creation
    if (req.audit) {
      logAudit(req, {
        level: "INFO",
        category: "comment",
        action: "comment_create",
        message: `Comment created on manhua: ${manhua.title}`,
        meta: {
          manhuaId,
          commentId: comment._id,
          textLength: text.length,
        },
      });
    }

    res.status(201).json({
      success: true,
      comment: {
        _id: comment._id,
        user: comment.user,
        username: comment.username,
        text: comment.text,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      },
      message: "Сэтгэгдэл амжилттай нэмэгдлээ"
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Алдаа гарлаа"
      });
    }
    next(err);
  }
};

// DELETE /api/comments/:commentId
// Delete a comment (owner or admin only)
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    if (!isValidId(commentId)) {
      return res.status(400).json({ success: false, message: "Сэтгэгдэл ID буруу байна" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Сэтгэгдэл олдсонгүй"
      });
    }

    // Check if user is owner or admin
    const isOwner = comment.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Энэ үйлдэлд эрх хүрэхгүй байна",
        code: "FORBIDDEN"
      });
    }

    await Comment.findByIdAndDelete(commentId);

    // Log comment deletion
    if (req.audit) {
      logAudit(req, {
        level: "INFO",
        category: "comment",
        action: "comment_delete",
        message: `Comment deleted: ${commentId}`,
        meta: {
          commentId,
          manhuaId: comment.manhua?.toString(),
        },
      });
    }

    res.json({
      success: true,
      message: "Сэтгэгдэл амжилттай устгагдлаа"
    });
  } catch (err) {
    next(err);
  }
};

