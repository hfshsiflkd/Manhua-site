// backend/src/routes/editorRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getMyManhuas,
  createManhua,
  updateManhua,
} = require("../controllers/editorController");

const {
  editorListChaptersOfManhua,
  editorGetChapterById,
  editorUpdateChapter,
} = require("../controllers/chapterController");

// бүх editor route-ууд auth шаардлагатай
router.use(protect);

// өөрийнхөө манхуа жагсаалт
router.get("/manhuas/mine", getMyManhuas);

// шинэ манхуа үүсгэх
router.post("/manhuas", createManhua);

// манхуа update хийх
router.patch("/manhuas/:id", updateManhua);

// ✅ EDITOR: өөрийн manhua-ны chapter-ууд
router.get("/manhuas/:slug/chapters", editorListChaptersOfManhua);

// ✅ EDITOR: chapter one by id
router.get("/chapters/:id", editorGetChapterById);
router.put("/chapters/:id", editorUpdateChapter);

module.exports = router;
