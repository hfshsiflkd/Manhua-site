const express = require("express");
const router = express.Router();

const {
  getChapterById,
  updateChapter,
} = require("../controllers/chapterController");

const { protect } = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

// ADMIN: GET /api/chapters/:id
router.get("/:id", protect, adminOnly, getChapterById);

// ADMIN: PUT /api/chapters/:id
router.put("/:id", protect, adminOnly, updateChapter);

module.exports = router;
