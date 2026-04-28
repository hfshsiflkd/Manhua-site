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
  adminDeleteChapter,
} = require("../../controllers/chapterController");

router.use(protect, adminOnly);
router.use("/trial", require("./trialRoutes"));
router.use("/users", require("./userAdminRoutes"));
router.use("/finance", require("./financeRoutes"));
router.use("/feedback", require("./feedbackRoutes"));
router.get(
  "/requests",
  require("../../controllers/admin/requestAdminController").listRequests
);


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
router.delete("/chapters/:id", adminDeleteChapter);


// Logs (old ActionLog endpoint - keep for backward compatibility)
router.get("/logs", listLogs);

// Audit Logs (new comprehensive audit system)
const {
  listLogs: listAuditLogs,
  getLogById: getAuditLogById,
} = require("../../controllers/admin/auditLogController");
router.get("/audit-logs", listAuditLogs);
router.get("/audit-logs/:id", getAuditLogById);

// Settings
const {
  getVipSettings,
  updateVipSettings,
  getFreeReadMode,
  setFreeReadMode,
} = require("../../controllers/adminSettingsController");
router.get("/settings/vip", getVipSettings);
router.put("/settings/vip", updateVipSettings);
router.get("/settings/free-read", getFreeReadMode);
router.post("/settings/free-read", setFreeReadMode);

module.exports = router;
