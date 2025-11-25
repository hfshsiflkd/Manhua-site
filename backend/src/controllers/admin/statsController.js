// src/controllers/admin/statsController.js
const User = require("../../models/User");
const Manhua = require("../../models/Manhua");

exports.getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVIP = await User.countDocuments({
      vipExpiresAt: { $gt: new Date() },
    });
    const totalManhuas = await Manhua.countDocuments();

    res.json({
      totalUsers,
      totalVIP,
      totalManhuas,
      totalChapters: 0,
    });
  } catch (err) {
    next(err);
  }
};
