const express = require("express");
const router = express.Router();
const {
  addFavorite,
  removeFavorite,
  getMyFavorites,
  toggleFavorite,
} = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getMyFavorites);
router.post("/:manhuaId/toggle", toggleFavorite); // New toggle endpoint
router.post("/:manhuaId", addFavorite); // Legacy
router.delete("/:manhuaId", removeFavorite);

module.exports = router;
