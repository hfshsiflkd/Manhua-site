const User = require("../models/User");

// GET /api/admin/users
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

// PATCH /api/admin/users/:id/vip  -> VIP хугацаа сунгах
// body: { months: 1 | 3 | 6 | 12 }
exports.setVIP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { months } = req.body;

    const allowed = [1, 3, 6, 12];
    if (!allowed.includes(months)) {
      return res
        .status(400)
        .json({ message: "VIP хугацаа 1, 3, 6, 12 сарын нэг байх ёстой" });
    }

    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000; // 30 хоног

    let baseTime;
    // Хугацаа дуусаагүй бол үлдсэн дээр нэмнэ
    if (user.vipExpiresAt && user.vipExpiresAt.getTime() > now) {
      baseTime = user.vipExpiresAt.getTime();
    } else {
      // Дууссан / тооцоогүй бол шинээр эхлүүлнэ
      baseTime = now;
    }

    const newExpire = new Date(baseTime + monthMs * months);
    user.vipExpiresAt = newExpire;
    user.isVIP = true;

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVIP: user.isVIP,
      vipExpiresAt: user.vipExpiresAt,
    });
  } catch (err) {
    next(err);
  }
};
