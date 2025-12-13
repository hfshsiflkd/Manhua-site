const router = require("express").Router();
const { protect } = require("../../middleware/authMiddleware");
const { getSetting, setSetting } = require("../../services/settingsService");

// admin шалгах (танайд өөр admin middleware байвал тэрийг хэрэглээрэй)
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// GET /api/admin/trial
router.get("/", protect, requireAdmin, async (req, res) => {
  const enabled = await getSetting("trial.enabled", true);
  const days = await getSetting("trial.days", 3);
  res.json({ enabled, days });
});

// PUT /api/admin/trial
router.put("/", protect, requireAdmin, async (req, res) => {
  const { enabled, days } = req.body;

  if (typeof enabled === "boolean") {
    await setSetting("trial.enabled", enabled);
  }

  if (days != null) {
    const d = Number(days);
    if (!Number.isFinite(d) || d < 0 || d > 30) {
      return res
        .status(400)
        .json({ message: "days нь 0-30 хооронд тоо байх ёстой" });
    }
    await setSetting("trial.days", d);
  }

  const newEnabled = await getSetting("trial.enabled", true);
  const newDays = await getSetting("trial.days", 3);
  res.json({ enabled: newEnabled, days: newDays });
});

module.exports = router;
