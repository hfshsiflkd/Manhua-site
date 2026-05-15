const express = require("express");
const router = express.Router();

const { register, login, me, logout } = require("../controllers/authController");
const authController = require("../controllers/authController");
const { protect, protectLight } = require("../middleware/authMiddleware");
const {
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  loginLimiter,
  registerLimiter,
} = require("../middleware/forgotPasswordLimiter");

// Бүртгүүлэх
router.post("/register", registerLimiter, register);

// Нэвтрэх (email эсвэл username ашиглаж болно)
router.post("/login", loginLimiter, login);

// Өөрийгөө авах — DB дуудахгүй, JWT-аас шууд (protectLight)
router.get("/me", protectLight, me);

// Logout — DB-д tokenVersion bump хийж, sessionToken цэвэрлэнэ.
// protectLight ашиглах нь user-ийн token expire болсон ч logout хийх боломжтой.
router.post("/logout", protectLight, logout);

// Forgot password with rate limiting
router.post(
  "/forgot-password",
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  authController.forgotPassword
);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
