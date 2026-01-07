const express = require("express");
const router = express.Router();

const {
  listFeedback,
  getFeedbackById,
  updateFeedbackStatus,
} = require("../../controllers/admin/feedbackAdminController");

// adminRoutes already applies protect + adminOnly
router.get("/", listFeedback);
router.get("/:id", getFeedbackById);
router.patch("/:id", updateFeedbackStatus);

module.exports = router;

