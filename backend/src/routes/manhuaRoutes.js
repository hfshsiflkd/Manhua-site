const express = require("express");
const router = express.Router();

const {
  getManhuas,
  getManhuaBySlug,
  getHomeSections,
} = require("../controllers/manhuaController");

const {
  getChaptersOfManhua,
  getChapter,
  createChapter,
} = require("../controllers/chapterController");

const { protect } = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

// -----------------------------------------------------
// PUBLIC ROUTES
// -----------------------------------------------------
router.get("/home/sections", getHomeSections);
// 1) GET all manhuas
router.get("/", getManhuas);

// 2) GET chapter list (must come BEFORE /:slug)
router.get("/:slug/chapters", getChaptersOfManhua);

// 3) GET single chapter
router.get("/:slug/chapters/:chapterNumber", getChapter);

// 4) GET single manhua (ALWAYS LAST)
router.get("/:slug", getManhuaBySlug);

// -----------------------------------------------------
// ADMIN ROUTES
// -----------------------------------------------------

// CREATE chapter (multi page)
router.post("/:slug/chapters", protect, adminOnly, createChapter);

module.exports = router;
