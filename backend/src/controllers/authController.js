const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// VIP шалгах helper
const computeIsVIP = (user) => {
  if (!user.vipExpiresAt) return false;
  return user.vipExpiresAt.getTime() > Date.now();
};

// JWT үүсгэгч (sessionToken дагаж явна)
const genToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      sessionToken: user.sessionToken || null,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, нууц үг шаардлагатай." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Энэ email аль хэдийн бүртгэлтэй." });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res
        .status(400)
        .json({ message: "Энэ username аль хэдийн бүртгэлтэй." });
    }

    const hashed = await bcrypt.hash(password, 10);

    // анхны sessionToken
    const sessionToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      username,
      email,
      password: hashed,
      role: "user",
      isVIP: false,
      vipExpiresAt: null,
      sessionToken,
    });

    const isVIP = computeIsVIP(user);
    if (user.isVIP !== isVIP) {
      user.isVIP = isVIP;
      await user.save();
    }

    const token = genToken(user);

    res.json({
      message: "Амжилттай бүртгэгдлээ",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVIP: user.isVIP,
        vipExpiresAt: user.vipExpiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login  (email эсвэл username)
exports.login = async (req, res, next) => {
  try {
    const { email, emailOrUsername, password } = req.body;
    const identifier = emailOrUsername || email;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Имэйл/нэр болон нууц үг шаардлагатай." });
    }

    let user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Нэвтрэх мэдээлэл буруу байна." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(400)
        .json({ message: "Нэвтрэх мэдээлэл буруу байна." });
    }

    // 🔥 Нэг аккаунтаар нэг л session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    user.sessionToken = sessionToken;

    const isVIP = computeIsVIP(user);
    if (user.isVIP !== isVIP) {
      user.isVIP = isVIP;
    }

    await user.save();

    const token = genToken(user);

    res.json({
      message: "Амжилттай нэвтэрлээ",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVIP: user.isVIP,
        vipExpiresAt: user.vipExpiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    const isVIP = computeIsVIP(user);
    if (user.isVIP !== isVIP) {
      user.isVIP = isVIP;
      await user.save();
    }

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

// Эд нарыг дараа жинхэнэ болгоно
exports.forgotPassword = async (req, res) => {
  res.json({ message: "forgot-password API одоохондоо бэлдээгүй" });
};

exports.resetPassword = async (req, res) => {
  res.json({ message: "reset-password API одоохондоо бэлдээгүй" });
};
