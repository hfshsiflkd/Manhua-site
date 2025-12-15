const express = require("express");
const router = express.Router();

const requireAdmin = require("../../middleware/requireAdmin");
const {
  listUsers,
  getUser,
  updateUser,
  resetPassword,
  forceLogout,
  blockUser,
  unblockUser,
  lockUser,
  unlockUser,
} = require("../../controllers/admin/userAdmin.controller");

router.use(requireAdmin);

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.post("/:id/reset-password", resetPassword);
router.post("/:id/force-logout", forceLogout);
router.post("/:id/block", blockUser);
router.post("/:id/unblock", unblockUser);
router.post("/:id/lock", lockUser);
router.post("/:id/unlock", unlockUser);

module.exports = router;
