// src/controllers/adminController.js
const User = require("../models/User");
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

// -------------------------
// ADMIN STATISTICS
// -------------------------
exports.getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVIP = await User.countDocuments({ isVIP: true });
    const totalManhuas = await Manhua.countDocuments();
    const totalChapters = await Chapter.countDocuments();

    res.json({
      totalUsers,
      totalVIP,
      totalManhuas,
      totalChapters,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------
// GET ALL USERS
// -------------------------
exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select("_id username email role isVIP vipExpiresAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json(users);
  } catch (err) {
    next(err);
  }
};

// -------------------------
// VIP EXTEND (ADMIN)
// allowed: 1, 3, 6, 12 months
// -------------------------
exports.extendVIP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { months } = req.body;

    const allowed = [1, 3, 6, 12];
    if (!allowed.includes(months)) {
      return res.status(400).json({
        message: "VIP сунгах хугацаа 1, 3, 6, 12 сарын нэг байх ёстой",
      });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    let base =
      user.vipExpiresAt && user.vipExpiresAt.getTime() > now
        ? user.vipExpiresAt.getTime()
        : now;

    const newExpire = new Date(base + monthMs * months);

    user.isVIP = true;
    user.vipExpiresAt = newExpire;
    await user.save();

    res.json({
      message: "VIP амжилттай сунгалаа",
      _id: user._id,
      username: user.username,
      email: user.email,
      isVIP: user.isVIP,
      vipExpiresAt: user.vipExpiresAt,
    });
  } catch (err) {
    next(err);
  }
};
