// src/routes/admin/adminRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const adminOnly = require("../../middleware/adminOnly");

const {
  getAdminStats,
  listUsers,
  createUserByAdmin,
  updateUserByAdmin,
  extendVIP,
  listManhuasWithOwner,
  getManhuaDetailAdmin,
  updateManhuaAdmin,
  deleteManhuaAdmin,
  listLogs,
} = require("../../controllers/admin");

const {
  adminListChaptersOfManhua,
  createChapter,
  getChapterById,
  updateChapter,
} = require("../../controllers/chapterController");

router.use(protect, adminOnly);

// Stats
router.get("/stats", getAdminStats);

// Users
router.get("/users", listUsers);
router.post("/users", createUserByAdmin);
router.patch("/users/:id", updateUserByAdmin);
router.patch("/users/:id/vip", extendVIP);

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

module.exports = router;
