// src/routes/manhua.routes.js
const router = require("express").Router();

const manhuaCtrl = require("../controllers/manhuaController");
const chapterPublicCtrl = require("../controllers/chapter.public.controller");
const chapterAdminCtrl = require("../controllers/admin/chapter.admin.controller");
const { protect } = require("../middleware/authMiddleware");
const { optionalProtect } = require("../middleware/optionalProtect");
const adminOnly = require("../middleware/adminOnly");

router.get("/home/sections", manhuaCtrl.getHomeSections);
router.get("/popular-today", manhuaCtrl.getPopularToday);
router.get("/teams", manhuaCtrl.getManhuaTeams);
router.get("/", manhuaCtrl.getManhuas);

router.get("/:slug/chapters", chapterPublicCtrl.getChaptersOfManhua);
router.get(
  "/:slug/chapters/:chapterNumber",
  optionalProtect,
  chapterPublicCtrl.getChapter
);
router.get("/:slug", manhuaCtrl.getManhuaBySlug);

// ADMIN (keep here if you want)
router.post(
  "/:slug/chapters",
  protect,
  adminOnly,
  chapterAdminCtrl.createChapter
);

module.exports = router;
