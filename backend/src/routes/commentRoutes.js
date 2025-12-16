// src/routes/commentRoutes.js
const router = require("express").Router();
const commentController = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");
const { checkDeviceId } = require("../middleware/deviceIdCheck");
const { requireActiveAccess } = require("../middleware/accessCheck");
const { commentRateLimiter } = require("../middleware/commentRateLimit");

// GET /api/comments/manhua/:manhuaId - List comments (logged-in users only)
router.get(
  "/manhua/:manhuaId",
  protect,
  checkDeviceId,
  commentController.getManhuaComments
);

// POST /api/comments/manhua/:manhuaId - Create comment (active access required)
router.post(
  "/manhua/:manhuaId",
  protect,
  checkDeviceId,
  requireActiveAccess,
  commentRateLimiter,
  commentController.createManhuaComment
);

// DELETE /api/comments/:commentId - Delete comment (owner or admin)
router.delete(
  "/:commentId",
  protect,
  checkDeviceId,
  commentController.deleteComment
);

module.exports = router;

