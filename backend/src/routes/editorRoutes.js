// backend/src/routes/editorRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const {
  getMyManhuas,
  createManhua,
  updateManhua,
} = require("../controllers/editorController");
const { getEditorLeaderboard } = require("../controllers/editorLeaderboardController");

const {
  editorListChaptersOfManhua,
  editorGetChapterById,
  editorUpdateChapter,
  editorCreateChapter,
} = require("../controllers/chapterController");

// бүх editor route-ууд auth шаардлагатай
router.use(protect);
router.use(requireRole("admin", "editor", "translator"));

// өөрийнхөө манхуа жагсаалт
router.get("/manhuas/mine", getMyManhuas);

// Leaderboard (chapters + payout)
router.get("/leaderboard", getEditorLeaderboard);

// шинэ манхуа үүсгэх
router.post("/manhuas", createManhua);

// манхуа update хийх
router.patch("/manhuas/:id", updateManhua);

// ✅ EDITOR: өөрийн manhua-ны chapter-ууд (LIST)
router.get("/manhuas/:slug/chapters", editorListChaptersOfManhua);

// ✅ EDITOR: шинэ chapter үүсгэх (CREATE)
router.post("/manhuas/:slug/chapters", editorCreateChapter);

// ✅ EDITOR: chapter one by id
router.get("/chapters/:id", editorGetChapterById);
router.put("/chapters/:id", editorUpdateChapter);

module.exports = router;
