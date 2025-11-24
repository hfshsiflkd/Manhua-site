// src/controllers/adminController.js
const User = require("../models/User");
const Manhua = require("../models/Manhua");
const ActionLog = require("../models/ActionLog");

/**
 * GET /api/admin/stats
 */
exports.getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVIP = await User.countDocuments({
      vipExpiresAt: { $gt: new Date() },
    });
    const totalManhuas = await Manhua.countDocuments();
    const totalChapters = 0; // Хэрвээ Chapter модель байвал эндээс тоолно

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

/**
 * GET /api/admin/users
 */
exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select("email username role vipExpiresAt isActive createdAt")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/vip
 * body: { months: number }
 */
exports.extendVIP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { months } = req.body;

    if (!months || months <= 0) {
      return res.status(400).json({ message: "Months is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const baseDate =
      user.vipExpiresAt && user.vipExpiresAt > new Date()
        ? user.vipExpiresAt
        : new Date();

    const newDate = new Date(baseDate);
    newDate.setMonth(newDate.getMonth() + months);

    user.vipExpiresAt = newDate;
    await user.save();

    res.json({
      _id: user._id,
      vipExpiresAt: user.vipExpiresAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/manhuas
 * Query: limit?
 * - Бүх manhua-г эзэн (createdBy) мэдээлэлтэй нь
 */
exports.listManhuasWithOwner = async (req, res, next) => {
  try {
    const { limit } = req.query;

    let query = Manhua.find({})
      .populate("createdBy", "username email role")
      .sort({ createdAt: -1 });

    if (limit) {
      const max = Math.min(Number(limit) || 20, 100);
      query = query.limit(max);
    }

    const manhuas = await query;
    res.json(manhuas); // ← ЭНД manhua**s** гэдгийг анхаараарай
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/manhuas/:id
 * - Нэг manhua + эзэн
 */
exports.getManhuaDetailAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const manhua = await Manhua.findById(id).populate(
      "createdBy",
      "username email role createdAt"
    );

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/manhuas/:id
 * - Admin тал manhua-г update хийх
 */
exports.updateManhuaAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const manhua = await Manhua.findByIdAndUpdate(id, req.body, {
      new: true,
    }).populate("createdBy", "username email role");

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // Хүсвэл энд ActionLog.create(...) хийж log хөтөлж болно

    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/manhuas/:id
 * - Admin манхуа-г устгах
 */
exports.deleteManhuaAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const manhua = await Manhua.findById(id);
    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    await manhua.deleteOne();

    // Хэрвээ Chapter модель байгаа бол энд chapters-ийг нь бас устгаж болно
    // await Chapter.deleteMany({ manhua: id });

    res.json({ message: "Manhua deleted" });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/logs
 */
exports.listLogs = async (req, res, next) => {
  try {
    const { userId, action, targetType, limit } = req.query;

    const query = {};
    if (userId) query.user = userId;
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const max = Math.min(Number(limit) || 50, 200);

    const logs = await ActionLog.find(query)
      .populate("user", "username email role")
      .sort({ createdAt: -1 })
      .limit(max);

    res.json(logs);
  } catch (err) {
    next(err);
  }
};