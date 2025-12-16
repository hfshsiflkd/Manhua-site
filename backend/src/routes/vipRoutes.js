// src/routes/vipRoutes.js
const express = require("express");
const router = express.Router();
const { getPlans, purchaseVip } = require("../controllers/vipController");
const { protect } = require("../middleware/authMiddleware");

// Public endpoint - anyone can see plans
router.get("/plans", getPlans);

// Protected endpoint - purchase requires auth
router.post("/purchase", protect, purchaseVip);

module.exports = router;

