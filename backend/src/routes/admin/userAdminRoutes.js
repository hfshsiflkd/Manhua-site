const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const adminOnly = require("../../middleware/adminOnly");

const {
  listUsers,
  createUserByAdmin,
  updateUserByAdmin,
  setVIP,
  unlockUser,
} = require("../../controllers/admin/userController");

// зөвхөн админ
router.use(protect);
router.use(adminOnly);

// UI дээр хэрэглэгдэж байгаа endpoint-ууд:
router.get("/", listUsers);
router.post("/", createUserByAdmin);
router.patch("/:id", updateUserByAdmin);
router.patch("/:id/vip", setVIP);

// ✅ new: unlock endpoint
router.patch("/:id/unlock", unlockUser);

module.exports = router;
