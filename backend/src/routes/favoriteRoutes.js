const express = require("express");
const router = express.Router();
const {
  addFavorite,
  removeFavorite,
  getMyFavorites,
} = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getMyFavorites);
router.post("/:manhuaId", addFavorite);
router.delete("/:manhuaId", removeFavorite);

module.exports = router;
