// src/routes/settingsRoutes.js
const router = require("express").Router();
const settingsController = require("../controllers/settingsController");

// Public settings endpoints
router.get("/vip", settingsController.getVipSettings);

module.exports = router;

