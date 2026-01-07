const router = require("express").Router();

const { getUserSpenderLeaderboard } = require("../controllers/userLeaderboardController");

// Public leaderboard (no auth)
router.get("/users", getUserSpenderLeaderboard);

module.exports = router;

