// src/routes/admin/adminRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const adminOnly = require("../../middleware/adminOnly");

const {
  getAdminStats,
  listUsers,
  extendVIP,
  listManhuasWithOwner,
  getManhuaDetailAdmin,
  updateManhuaAdmin,
  deleteManhuaAdmin,
  listLogs,
} = require("../../controllers/adminController");

router.use(protect, adminOnly);

router.get("/stats", getAdminStats);
router.get("/users", listUsers);
router.patch("/users/:id/vip", extendVIP);

// Logs
router.get("/logs", listLogs);

// Manhuas
router.get("/manhuas", listManhuasWithOwner);
router.get("/manhuas/:id", getManhuaDetailAdmin);
router.patch("/manhuas/:id", updateManhuaAdmin);
router.delete("/manhuas/:id", deleteManhuaAdmin);

module.exports = router;
