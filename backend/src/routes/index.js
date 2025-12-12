// src/routes/index.js
const router = require("express").Router();

const authRoutes = require("./authRoutes");
const manhuaRoutes = require("./manhua.routes");
const chapterRoutes = require("./chapterRoutes");
const favoriteRoutes = require("./favoriteRoutes");
const bookmarkRoutes = require("./bookmarkRoutes");
const statsRoutes = require("./statsRoutes");
const uploadRoutes = require("./uploadRoutes");
const editorRoutes = require("./editorRoutes");
const adminRoutes = require("./admin/adminRoutes");

router.use("/auth", authRoutes);

router.use("/manhuas", manhuaRoutes);
router.use("/chapters", chapterRoutes);

router.use("/me/favorites", favoriteRoutes);
router.use("/me/bookmarks", bookmarkRoutes);

router.use("/stats", statsRoutes);

router.use("/upload", uploadRoutes);
router.use("/editor", editorRoutes);

router.use("/admin", adminRoutes);

module.exports = router;
