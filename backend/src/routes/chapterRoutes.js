// src/routes/chapterRoutes.js
const express = require("express");
const router = express.Router();

const {
  getChaptersOfManhua,
  getChapter,
} = require("../controllers/chapterController");

// PUBLIC
router.get("/manhuas/:slug/chapters", getChaptersOfManhua);
router.get("/manhuas/:slug/chapters/:chapterNumber", getChapter);

module.exports = router;
