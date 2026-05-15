// src/controllers/userController.js
const User = require("../models/User");
const { r2Client, PutObjectCommand, DeleteObjectCommand } = require("../config/r2");
const { toWebpBuffer } = require("../utils/image");
const upload = require("../middleware/upload");
const mongoose = require("mongoose");

// POST /api/user/avatar
exports.uploadAvatar = [
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Файл ирсэнгүй." });
      }

      // Validate file type (any image)
      if (!String(req.file.mimetype || "").startsWith("image/")) {
        return res.status(400).json({
          message: "Зөвхөн зураг файл ашиглана уу.",
        });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({
          message: "Зургийн хэмжээ 5MB-аас их байна.",
        });
      }

      // Upload to R2
      if (
        !process.env.R2_ACCOUNT_ID ||
        !process.env.R2_ACCESS_KEY_ID ||
        !process.env.R2_SECRET_ACCESS_KEY ||
        !process.env.R2_BUCKET_NAME ||
        !process.env.R2_PUBLIC_BASE_URL
      ) {
        console.error("R2 config дутуу байна");
        return res
          .status(500)
          .json({ message: "R2 тохиргоо (env) дутуу байна." });
      }

      const bucket = process.env.R2_BUCKET_NAME;
      const folder = "avatars";
      const key = `${folder}/user-${req.user._id}-${Date.now()}.webp`;
      let converted;
      try {
        converted = await toWebpBuffer(req.file);
      } catch {
        return res.status(400).json({ message: "Зөвхөн зураг файл оруулна уу." });
      }

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: converted.buffer,
        ContentType: converted.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      });

      await r2Client.send(command);

      const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;

      // Delete old avatar from R2 if exists
      const oldUser = await User.findById(req.user._id).select("avatar");
      if (oldUser?.avatar) {
        try {
          const R2_BASE = process.env.R2_PUBLIC_BASE_URL || "";
          const oldKey = oldUser.avatar.startsWith(R2_BASE)
            ? oldUser.avatar.slice(R2_BASE.length + 1)
            : null;
          if (oldKey) {
            await r2Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: oldKey }));
          }
        } catch {
          // Хуучин avatar устгахад алдаа гарвал үргэлжлүүлнэ — non-fatal
        }
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: publicUrl },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "Хэрэглэгч олдсонгүй." });
      }

      res.json({
        success: true,
        avatar: publicUrl,
        message: "Профайл зураг амжилттай шинэчлэгдлээ.",
      });
    } catch (err) {
      console.error("Avatar upload error:", err);
      next(err);
    }
  },
];

// GET /api/user/me/status/:manhuaId - Check favorite/bookmark status
exports.getManhuaStatus = async (req, res, next) => {
  try {
    const { manhuaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(manhuaId)) {
      return res.status(400).json({ success: false, message: "Manhua ID буруу байна" });
    }
    const Favorite = require("../models/Favorite");
    const Bookmark = require("../models/Bookmark");

    const [favorite, bookmark] = await Promise.all([
      Favorite.findOne({ user: req.user._id, manhua: manhuaId }),
      Bookmark.findOne({ user: req.user._id, manhua: manhuaId }),
    ]);

    res.json({
      isFavorited: !!favorite,
      isBookmarked: !!bookmark,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/user/profile - Update username
exports.updateProfile = async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== "string") {
      return res.status(400).json({
        success: false,
        message: "Хэрэглэгчийн нэр шаардлагатай.",
      });
    }

    const { normalizeUsername } = require("../utils/normalize");
    const normalizedUsername = normalizeUsername(username);

    // Validate username length
    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Хэрэглэгчийн нэр 3-30 тэмдэгт байх ёстой.",
      });
    }

    // Validate username format (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Хэрэглэгчийн нэр зөвхөн үсэг, тоо, _, - агуулж болно.",
      });
    }

    // Check if username already exists (excluding current user)
    const existingUser = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Энэ хэрэглэгчийн нэр аль хэдийн ашиглагдаж байна.",
      });
    }

    // Update username
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username: normalizedUsername },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Хэрэглэгч олдсонгүй.",
      });
    }

    // Increment tokenVersion to invalidate existing tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVIP: user.isVIP,
        vipExpiresAt: user.vipExpiresAt,
        avatar: user.avatar,
      },
      message: "Хэрэглэгчийн нэр амжилттай шинэчлэгдлээ.",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Энэ хэрэглэгчийн нэр аль хэдийн ашиглагдаж байна.",
      });
    }
    next(err);
  }
};

// PATCH /api/user/email - Update email (requires password confirmation)
exports.updateEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Имэйл шаардлагатай.",
      });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Нууц үг баталгаажуулах шаардлагатай.",
      });
    }

    const { normalizeEmail } = require("../utils/normalize");
    const normalizedEmail = normalizeEmail(email);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Зөв имэйл хаяг оруулна уу.",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Хэрэглэгч олдсонгүй.",
      });
    }

    // Verify current password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Нууц үг буруу байна.",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Энэ имэйл аль хэдийн бүртгэлтэй.",
      });
    }

    user.email = normalizedEmail;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVIP: user.isVIP,
        vipExpiresAt: user.vipExpiresAt,
        avatar: user.avatar,
      },
      message: "Имэйл амжилттай шинэчлэгдлээ.",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Энэ имэйл аль хэдийн бүртгэлтэй.",
      });
    }
    next(err);
  }
};

// PATCH /api/user/password - Update password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({
        success: false,
        message: "Одоогийн нууц үг шаардлагатай.",
      });
    }

    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({
        success: false,
        message: "Шинэ нууц үг шаардлагатай.",
      });
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байна.",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Хэрэглэгч олдсонгүй.",
      });
    }

    // Verify current password
    const isPasswordValid = await user.matchPassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Одоогийн нууц үг буруу байна.",
      });
    }

    // Check if new password is same as current
    const isSamePassword = await user.matchPassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "Шинэ нууц үг одоогийн нууц үгтэй ижил байна.",
      });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVIP: user.isVIP,
        vipExpiresAt: user.vipExpiresAt,
        avatar: user.avatar,
      },
      message: "Нууц үг амжилттай шинэчлэгдлээ.",
    });
  } catch (err) {
    next(err);
  }
};

