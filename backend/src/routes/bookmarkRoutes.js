const express = require("express");
const router = express.Router();
const {
  setBookmark,
  getMyBookmarks,
  toggleBookmark,
} = require("../controllers/bookmarkController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getMyBookmarks);
router.post("/:manhuaId/toggle", toggleBookmark); // New toggle endpoint
router.post("/", setBookmark); // Existing reading bookmark endpoint

module.exports = router;
