const User = require("../models/User");
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");

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
