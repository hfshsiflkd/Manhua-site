// src/routes/chapterRoutes.js
const express = require("express");
const router = express.Router();

const { optionalProtect } = require("../middleware/optionalProtect");
const {
  chapterReadStartLimiter,
  chapterReadConfirmLimiter,
} = require("../middleware/chapterReadRateLimit");

const {
  startRead,
  confirmRead,
} = require("../controllers/chapterReadController");

router.post("/:id/read/start", optionalProtect, chapterReadStartLimiter, startRead);
router.post(
  "/:id/read/confirm",
  optionalProtect,
  chapterReadConfirmLimiter,
  confirmRead
);

module.exports = router;
