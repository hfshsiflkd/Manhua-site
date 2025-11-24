// backend/src/routes/editorRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getMyManhuas,
  createManhua,
  updateManhua,
} = require("../controllers/editorController");

// бүх editor route-ууд auth шаардлагатай
router.use(protect);

// өөрийнхөө манхуа жагсаалт
router.get("/manhuas/mine", getMyManhuas);

// шинэ манхуа үүсгэх
router.post("/manhuas", createManhua);

// манхуа update хийх
router.patch("/manhuas/:id", updateManhua);

module.exports = router;
