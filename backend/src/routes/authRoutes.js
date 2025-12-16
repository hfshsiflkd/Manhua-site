const express = require("express");
const router = express.Router();

const { register, login, me } = require("../controllers/authController");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
} = require("../middleware/forgotPasswordLimiter");

// Бүртгүүлэх
router.post("/register", register);

// Нэвтрэх (email эсвэл username ашиглаж болно)
router.post("/login", login);

// Өөрийгөө авах
router.get("/me", protect, me);

// Forgot password with rate limiting
router.post(
  "/forgot-password",
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  authController.forgotPassword
);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
