// src/controllers/admin/userController.js
const User = require("../../models/User");
const logAction = require("../../utils/logAction");
const { invalidateUserCache } = require("../../middleware/authMiddleware");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

function addMonthsSafe(date, months) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) d.setDate(0);
  return d;
}

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const { role, q } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { username: new RegExp(safe, "i") },
        { email: new RegExp(safe, "i") },
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

    const safe = user.toObject();
    delete safe.password;
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
    if (!isValidId(id)) return res.status(400).json({ message: "ID буруу байна" });
    const { username, email, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = String(email).toLowerCase();
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    invalidateUserCache(user._id);

    await logAction({
      userId: req.user._id,
      action: "UPDATE_USER",
      targetType: "User",
      targetId: user._id,
      description: `Admin updated user ${user.username}`,
      meta: { body: req.body },
    });

    const safe = user.toObject();
    delete safe.password;
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
    if (!isValidId(id)) return res.status(400).json({ message: "ID буруу байна" });
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
    const newExp = addMonthsSafe(base, months);

    user.vipExpiresAt = newExp;
    user.isVIP = true;
    await user.save();

    await logAction({
      userId: req.user._id,
      action: "EXTEND_VIP",
      targetType: "User",
      targetId: user._id,
      description: `Admin extended VIP for ${user.username} by ${months} month(s)`,
      meta: { months, vipExpiresAt: newExp },
    });

    const safe = user.toObject();
    delete safe.password;
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
    if (!isValidId(id)) return res.status(400).json({ message: "ID буруу байна" });

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

    const safe = user.toObject();
    delete safe.password;
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};
