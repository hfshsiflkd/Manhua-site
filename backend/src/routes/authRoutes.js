const express = require("express");
const router = express.Router();

const {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  forgotPasswordIpLimiter,
  forgotPasswordIdLimiter,
} = require("../middleware/forgotPasswordLimiter");

// Бүртгүүлэх
router.post("/register", register);

// Нэвтрэх (email эсвэл username ашиглаж болно)
router.post("/login", login);

// Өөрийгөө авах
router.get("/me", protect, me);

router.post(
  "/forgot-password",
  forgotPasswordIpLimiter,
  forgotPasswordIdLimiter,
  forgotPassword
);
router.post("/reset-password", resetPassword);

module.exports = router;
