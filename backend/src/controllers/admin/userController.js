// src/controllers/admin/userController.js
const User = require("../../models/User");
const logAction = require("../../utils/logAction");

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

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

exports.createUserByAdmin = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Ийм email-тэй хэрэглэгч байна" });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || "user",
    });

    await logAction({
      userId: req.user._id,
      action: "CREATE_USER",
      targetType: "User",
      targetId: user._id,
      description: `Admin created user ${user.username}`,
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

exports.updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
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

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};
