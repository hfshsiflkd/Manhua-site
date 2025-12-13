// src/routes/chapterRoutes.js
const express = require("express");
const router = express.Router();

const {
  getChaptersOfManhua,
  getChapter,
} = require("../controllers/chapterController");
const { optionalProtect } = require("../middleware/optionalProtect");



module.exports = router;
