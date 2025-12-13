const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const TrialDevice = require("../models/TrialDevice");
const { getSetting } = require("../services/settingsService");

const JWT_SECRET = process.env.JWT_SECRET || "secret";



// IP авах (Railway/Vercel/Proxy үед зөв ажиллана)
function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "";
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

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

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // ✅ deviceId (frontend-ээс x-device-id header ирнэ)
    const deviceId = String(req.headers["x-device-id"] || "").trim();
    const ip = getClientIP(req);

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, нууц үг шаардлагатай." });
    }

    if (!deviceId) {
      return res.status(400).json({
        message:
          "Device мэдээлэл дутуу байна. (x-device-id header шаардлагатай)",
      });
    }

    const normEmail = normalizeEmail(email);
    const normUsername = normalizeUsername(username);

    const existingEmail = await User.findOne({ email: normEmail });
    if (existingEmail) {
      return res
        .status(400)
        .json({ message: "Энэ email аль хэдийн бүртгэлтэй." });
    }

    const existingUsername = await User.findOne({ username: normUsername });
    if (existingUsername) {
      return res
        .status(400)
        .json({ message: "Энэ username аль хэдийн бүртгэлтэй." });
    }

    const hashed = await bcrypt.hash(password, 10);

    // анхны sessionToken
    const sessionToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      username: normUsername,
      email: normEmail,
      password: hashed,
      role: "user",

      isVIP: false,
      vipExpiresAt: null,

      sessionToken,

      // ✅ optional: user дээр хадгалж болно (лог/аналитик)
      deviceId,
      lastRegisterIP: ip,

      // ✅ trial flags (User schema дээр нэмнэ)
      hasUsedTrial: false,
      trialGrantedAt: null,
    });

    // =========================
    // ✅ TRIAL = VIP (нэг device дээр 1 л удаа)
    // admin-аас days тохируулж болно
    // =========================
    const trialEnabled = await getSetting("trial.enabled", true);
    const trialDays = await getSetting("trial.days", 3);

    let trialGranted = false;

    if (trialEnabled && !user.hasUsedTrial) {
      const existed = await TrialDevice.findOne({ deviceId });

      if (!existed) {
        // ✅ анхны удаа → trial олгоно
        user.vipExpiresAt = new Date(
          Date.now() + Number(trialDays) * 24 * 60 * 60 * 1000
        );
        user.hasUsedTrial = true;
        user.trialGrantedAt = new Date();
        trialGranted = true;

        await TrialDevice.create({
          deviceId,
          firstUserId: user._id,
          firstGrantedAt: user.trialGrantedAt,
          ip,
        });
      } else {
        // ❌ энэ device өмнө нь trial авсан → энэ user-д trial өгөхгүй
        user.hasUsedTrial = true; // нэг удаа л гэдгийг хатуу болгох (optional)
        trialGranted = false;
      }
    }

    // VIP flag update
    const isVIP = computeIsVIP(user);
    user.isVIP = isVIP;

    await user.save();

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

        // ✅ trial info (frontend дээр badge/alert гаргана)
        hasUsedTrial: user.hasUsedTrial,
        trialGrantedAt: user.trialGrantedAt,
      },
      trial: { granted: trialGranted },
    });
  } catch (err) {
    next(err);
  }
};

// helpers
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    ""
  );
}

function nowMs() {
  return Date.now();
}

// Policy constants (та хүсвэл config/setting болгоод admin-аас тохируулж болно)
const SWITCH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 цаг
const SWITCH_THRESHOLD = 3; // 3 дахь удаанаас lock эхэлнэ
const LOCK_DURATIONS_MS = [
  0,                         // 0 -> unused
  0,                         // 1st switch
  0,                         // 2nd switch
  1 * 24 * 60 * 60 * 1000,   // 3rd -> 1 day
  3 * 24 * 60 * 60 * 1000,   // 4th -> 3 days
  7 * 24 * 60 * 60 * 1000,   // 5th+ -> 7 days
];

function getLockDurationMs(switchCount) {
  if (switchCount <= 2) return 0;
  if (switchCount === 3) return LOCK_DURATIONS_MS[3];
  if (switchCount === 4) return LOCK_DURATIONS_MS[4];
  return LOCK_DURATIONS_MS[5];
}
function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "";
}
function nowMs() {
  return Date.now();
}

// POST /api/auth/login  (email эсвэл username)
exports.login = async (req, res, next) => {
  try {
    const { email, emailOrUsername, password } = req.body;
    const identifier = (emailOrUsername || email || "").trim();

    // ✅ deviceId заавал (account sharing-ийг хянахын тулд)
    const deviceId = String(req.headers["x-device-id"] || "").trim();
    const ip = getClientIP(req);

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Имэйл/нэр болон нууц үг шаардлагатай." });
    }

    if (!deviceId) {
      return res.status(400).json({
        message: "Device мэдээлэл дутуу байна. (x-device-id шаардлагатай)",
      });
    }

    const identifierEmail = identifier.includes("@")
      ? identifier.toLowerCase()
      : identifier;

    let user = await User.findOne({
      $or: [{ email: identifierEmail }, { username: identifier }],
    });

    if (!user) {
      return res.status(400).json({ message: "Нэвтрэх мэдээлэл буруу байна." });
    }

    // ✅ Lock шалгах (login хийхээс өмнө)
    if (user.lockUntil && user.lockUntil.getTime() > nowMs()) {
      return res.status(403).json({
        message: "Түр түгжигдсэн. Дахин оролдоно уу.",
        lockUntil: user.lockUntil,
        reason: user.lockReason || "device_switch",
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Нэвтрэх мэдээлэл буруу байна." });
    }

    // =========================
    // ✅ Device switch policy (амжилттай login дараа тоолно)
    // =========================
    const prevDevice = user.lastDeviceId || "";
    const isSwitch = prevDevice && prevDevice !== deviceId;

    // Window reset logic
    const wStart = user.deviceSwitchWindowStart
      ? user.deviceSwitchWindowStart.getTime()
      : 0;

    const inWindow = wStart && nowMs() - wStart <= SWITCH_WINDOW_MS;

    if (isSwitch) {
      // window эхлүүлэх/үргэлжлүүлэх
      if (!inWindow) {
        user.deviceSwitchWindowStart = new Date(nowMs());
        user.deviceSwitchCount = 1;
      } else {
        user.deviceSwitchCount = (user.deviceSwitchCount || 0) + 1;
      }

      // threshold давбал lock
      const count = user.deviceSwitchCount || 0;
      const lockMs = getLockDurationMs(count);

      if (lockMs > 0 && count >= SWITCH_THRESHOLD) {
        user.lockUntil = new Date(nowMs() + lockMs);
        user.lockReason = `device_switch_${count}`;
        // СЭШН token шинэчлэхгүйгээр шууд lock өгөөд буцааж болно
        await user.save();

        return res.status(403).json({
          message: "Олон төхөөрөмжөөс давтамжтай нэвтрэх оролдлого илэрсэн тул түр түгжлээ.",
          lockUntil: user.lockUntil,
          reason: user.lockReason,
        });
      }
    } else {
      // Switch биш бол window-г reset хийх шаардлагагүй.
      // Хүсвэл тогтвортой төхөөрөмжөөр орж байвал count-г бага зэрэг бууруулж болно (optional).
    }

    // ✅ lastDeviceId шинэчилнэ (амжилттай login үед)
    user.lastDeviceId = deviceId;

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
      security: {
        deviceId,
        switched: isSwitch,
        switchCount: user.deviceSwitchCount || 0,
        windowStart: user.deviceSwitchWindowStart,
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
