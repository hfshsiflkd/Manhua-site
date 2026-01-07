// src/routes/chapterRoutes.js
const express = require("express");
const router = express.Router();

const { optionalProtect } = require("../middleware/optionalProtect");

const {
  startRead,
  confirmRead,
} = require("../controllers/chapterReadController");

router.post("/:id/read/start", optionalProtect, startRead);
router.post("/:id/read/confirm", optionalProtect, confirmRead);

module.exports = router;
