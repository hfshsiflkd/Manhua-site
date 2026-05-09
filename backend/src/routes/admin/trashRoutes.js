// src/routes/admin/trashRoutes.js
const express = require("express");
const router = express.Router();

const {
  listDeletedManhuas,
  getDeletedManhuaDetail,
  listDeletedChapters,
  restoreManhua,
  restoreChapter,
  permanentDeleteManhua,
  permanentDeleteChapter,
} = require("../../controllers/admin/trashController");

// Note: parent (adminRoutes.js) already applies protect + adminOnly

router.get("/manhuas", listDeletedManhuas);
router.get("/manhuas/:id", getDeletedManhuaDetail);
router.post("/manhuas/:id/restore", restoreManhua);
router.delete("/manhuas/:id", permanentDeleteManhua);

router.get("/chapters", listDeletedChapters);
router.post("/chapters/:id/restore", restoreChapter);
router.delete("/chapters/:id", permanentDeleteChapter);

module.exports = router;
