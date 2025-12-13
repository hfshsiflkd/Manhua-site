// src/controllers/admin/userController.js
const User = require("../../models/User");
const logAction = require("../../utils/logAction");

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const { role, q } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { username: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
      ];
    }

    // Нууц үгийг буцаахгүй
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

// POST /api/admin/users
exports.createUserByAdmin = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const existsEmail = await User.findOne({
      email: String(email).toLowerCase(),
    });
    if (existsEmail) {
      return res.status(400).json({ message: "Ийм email-тэй хэрэглэгч байна" });
    }

    const existsUsername = await User.findOne({ username });
    if (existsUsername) {
      return res
        .status(400)
        .json({ message: "Ийм username-тэй хэрэглэгч байна" });
    }

    const user = await User.create({
      username,
      email: String(email).toLowerCase(),
      password,
      role: role || "user",
      isActive: true,
    });

    await logAction({
      userId: req.user._id,
      action: "CREATE_USER",
      targetType: "User",
      targetId: user._id,
      description: `Admin created user ${user.username}`,
    });

    const safe = await User.findById(user._id).select("-password");
    res.status(201).json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

// PATCH /api/admin/users/:id
exports.updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = String(email).toLowerCase();
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    await logAction({
      userId: req.user._id,
      action: "UPDATE_USER",
      targetType: "User",
      targetId: user._id,
      description: `Admin updated user ${user.username}`,
      meta: { body: req.body },
    });

    const safe = await User.findById(user._id).select("-password");
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

// PATCH /api/admin/users/:id/vip
// body: { months: number }
exports.setVIP = async (req, res) => {
  try {
    const { id } = req.params;
    const months = Number(req.body.months ?? 1);

    if (!Number.isFinite(months) || months <= 0 || months > 120) {
      return res
        .status(400)
        .json({ message: "months нь 1-120 хооронд тоо байх ёстой" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    const now = new Date();
    const base =
      user.vipExpiresAt && user.vipExpiresAt > now ? user.vipExpiresAt : now;
    const newExp = new Date(base.getTime());
    newExp.setMonth(newExp.getMonth() + months);

    user.vipExpiresAt = newExp;
    user.isVIP = true; // ✅ VIP өгсөн бол true
    await user.save();

    await logAction({
      userId: req.user._id,
      action: "EXTEND_VIP",
      targetType: "User",
      targetId: user._id,
      description: `Admin extended VIP for ${user.username} by ${months} month(s)`,
      meta: { months, vipExpiresAt: newExp },
    });

    const safe = await User.findById(user._id).select("-password");
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

// PATCH /api/admin/users/:id/unlock
exports.unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    user.lockUntil = null;
    user.lockReason = "";
    user.deviceSwitchWindowStart = null;
    user.deviceSwitchCount = 0;

    await user.save();

    await logAction({
      userId: req.user._id,
      action: "UNLOCK_USER",
      targetType: "User",
      targetId: user._id,
      description: `Admin unlocked user ${user.username}`,
    });

    const safe = await User.findById(user._id).select("-password");
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};
