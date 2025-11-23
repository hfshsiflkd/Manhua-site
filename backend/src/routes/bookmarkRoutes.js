const express = require("express");
const router = express.Router();
const {
  setBookmark,
  getMyBookmarks,
} = require("../controllers/bookmarkController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getMyBookmarks);
router.post("/", setBookmark);

module.exports = router;
