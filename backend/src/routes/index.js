// src/routes/index.js
const router = require("express").Router();

const authRoutes = require("./authRoutes");
const manhuaRoutes = require("./manhua.routes");
const chapterRoutes = require("./chapterRoutes");
const favoriteRoutes = require("./favoriteRoutes");
const bookmarkRoutes = require("./bookmarkRoutes");
const commentRoutes = require("./commentRoutes");
const settingsRoutes = require("./settingsRoutes");
const statsRoutes = require("./statsRoutes");
const uploadRoutes = require("./uploadRoutes");
const editorRoutes = require("./editorRoutes");
const adminRoutes = require("./admin/adminRoutes");
const vipRoutes = require("./vipRoutes");
const leaderboardRoutes = require("./leaderboardRoutes");
const feedbackRoutes = require("./feedbackRoutes");
const requestRoutes = require("./requestRoutes");
const userController = require("../controllers/userController");
const teamController = require("../controllers/teamController");
const { protect } = require("../middleware/authMiddleware");

router.use("/auth", authRoutes);

router.use("/manhuas", manhuaRoutes);
router.use("/chapters", chapterRoutes);

router.use("/me/favorites", favoriteRoutes);
router.use("/me/bookmarks", bookmarkRoutes);
router.use("/comments", commentRoutes);
router.use("/settings", settingsRoutes);

// User routes
router.post("/user/avatar", protect, userController.uploadAvatar);
router.get(
  "/user/me/status/:manhuaId",
  protect,
  userController.getManhuaStatus
);
router.patch("/user/profile", protect, userController.updateProfile);
router.patch("/user/email", protect, userController.updateEmail);
router.patch("/user/password", protect, userController.updatePassword);

// Team invites for all logged-in users
router.get("/me/team-invites", protect, teamController.listMyTeamInvites);
router.post(
  "/me/team-invites/:inviteId/accept",
  protect,
  teamController.acceptTeamInvite
);
router.post(
  "/me/team-invites/:inviteId/decline",
  protect,
  teamController.declineTeamInvite
);

router.use("/stats", statsRoutes);

router.use("/upload", uploadRoutes);
router.use("/editor", editorRoutes);
router.use("/vip", vipRoutes);

router.use("/leaderboard", leaderboardRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/requests", requestRoutes);

router.use("/admin", adminRoutes);

module.exports = router;
