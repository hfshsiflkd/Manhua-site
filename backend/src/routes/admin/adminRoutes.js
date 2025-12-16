// src/routes/admin/adminRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const adminOnly = require("../../middleware/adminOnly");

const {
  getAdminStats,
  listManhuasWithOwner,
  getManhuaDetailAdmin,
  updateManhuaAdmin,
  deleteManhuaAdmin,
  listLogs,
  unlockUser,
} = require("../../controllers/admin");

const {
  adminListChaptersOfManhua,
  createChapter,
  getChapterById,
  updateChapter,
} = require("../../controllers/chapterController");

router.use(protect, adminOnly);
router.use("/trial", require("./trialRoutes"));
router.use("/users", require("./userAdminRoutes"));


// Stats
router.get("/stats", getAdminStats);


// Manhuas (ADMIN)
router.get("/manhuas", listManhuasWithOwner);
router.get("/manhuas/:id", getManhuaDetailAdmin);
router.patch("/manhuas/:id", updateManhuaAdmin);
router.delete("/manhuas/:id", deleteManhuaAdmin);

// ✅ ADMIN manhua chapters
router.get("/manhuas/:slug/chapters", adminListChaptersOfManhua);
router.post("/manhuas/:slug/chapters", createChapter);

// ✅ ADMIN chapter by id
router.get("/chapters/:id", getChapterById);
router.put("/chapters/:id", updateChapter);


// Logs
router.get("/logs", listLogs);

// Settings
const {
  getVipSettings,
  updateVipSettings,
} = require("../../controllers/adminSettingsController");
router.get("/settings/vip", getVipSettings);
router.put("/settings/vip", updateVipSettings);

module.exports = router;
