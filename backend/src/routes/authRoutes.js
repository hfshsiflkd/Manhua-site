const express = require("express");
const router = express.Router();

const {
  register,
  login,
  me,
} = require("../controllers/authController");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Бүртгүүлэх
router.post("/register", register);

// Нэвтрэх (email эсвэл username ашиглаж болно)
router.post("/login", login);

// Өөрийгөө авах
router.get("/me", protect, me);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
