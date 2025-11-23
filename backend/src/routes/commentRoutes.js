const express = require("express");
const router = express.Router();
const {
  getComments,
  createComment,
  deleteComment,
} = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

// chapter comments
router.get("/chapters/:chapterId/comments", getComments);
router.post("/chapters/:chapterId/comments", protect, createComment);

// delete comment
router.delete("/comments/:id", protect, deleteComment);

module.exports = router;
