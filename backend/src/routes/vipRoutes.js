// src/routes/vipRoutes.js
const express = require("express");
const router = express.Router();
const { getPlans, purchaseVip } = require("../controllers/vipController");
const { protect } = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

// Public endpoint - anyone can see plans
router.get("/plans", getPlans);

// Admin-only: grant VIP after verifying bank transfer
router.post("/purchase", protect, adminOnly, purchaseVip);

module.exports = router;

