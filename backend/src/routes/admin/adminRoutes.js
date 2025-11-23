const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const adminOnly = require("../../middleware/adminOnly");

const {
  getAdminStats,
  listUsers,
  extendVIP,
} = require("../../controllers/adminController");

router.use(protect, adminOnly);

router.get("/stats", getAdminStats);
router.get("/users", listUsers);
router.patch("/users/:id/vip", extendVIP);

module.exports = router;
