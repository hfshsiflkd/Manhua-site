// src/controllers/admin/vipController.js
const User = require("../../models/User");

exports.extendVIP = async (req, res) => {
  try {
    const { id } = req.params;
    const { months } = req.body;

    if (!months || months <= 0) {
      return res.status(400).json({ message: "Months is required" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

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
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};
