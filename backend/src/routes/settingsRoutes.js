// src/routes/settingsRoutes.js
const router = require("express").Router();
const settingsController = require("../controllers/settingsController");
const AppSetting = require("../models/AppSetting");

// Public settings endpoints
router.get("/vip", settingsController.getVipSettings);

// Public: free read mode status
router.get("/free-read", async (req, res, next) => {
  try {
    const doc = await AppSetting.findOne({ key: "freeReadMode" });
    const value = doc?.value || { enabled: false, expiresAt: null };
    // Check if expired
    const active =
      value.enabled &&
      (!value.expiresAt || new Date(value.expiresAt).getTime() > Date.now());
    res.json({ active, expiresAt: value.expiresAt || null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

