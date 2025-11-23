const User = require("../models/User");

// months = 1, 3, 6, 12
exports.extendVIP = async (req, res, next) => {
  try {
    const { months } = req.body;
    const { id } = req.params;

    if (![1, 3, 6, 12].includes(months)) {
      return res.status(400).json({ message: "Invalid VIP duration" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000; // 30 days

    let newExpire;

    // Хэрвээ хугацаа дуусаагүй байвал — үлдсэн дээр нэмж сунгана
    if (user.vipExpiresAt && user.vipExpiresAt > now) {
      newExpire = new Date(
        user.vipExpiresAt.getTime() + monthMs * months
      );
    } else {
      // Шинэ VIP хугацаа эхлүүлнэ
      newExpire = new Date(now + monthMs * months);
    }

    user.vipExpiresAt = newExpire;
    user.isVIP = true;
    await user.save();

    res.json({
      message: "VIP updated",
      vipExpiresAt: user.vipExpiresAt,
    });
  } catch (err) {
    next(err);
  }
};
