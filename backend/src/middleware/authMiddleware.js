const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Token олдсонгүй" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    // ✅ LOCK CHECK - Check if user is locked
    const now = Date.now();
    if (user.lockUntil && new Date(user.lockUntil).getTime() > now) {
      const lockUntil = new Date(user.lockUntil);
      const remainingSeconds = Math.ceil((lockUntil.getTime() - now) / 1000);

      // Check if this is a device switch lock
      const isDeviceSwitchLock = user.lockReason === "Too many device switches";
      const response = {
        success: false,
        message: "Түр түгжигдсэн. Дахин оролдоно уу.",
        code: isDeviceSwitchLock
          ? "DEVICE_SWITCH_LOCK"
          : user.lockReason || "LOCKED",
        lockUntil: lockUntil.toISOString(),
        remainingSeconds,
        reason: user.lockReason || "LOCKED",
      };

      // Add devicePolicy metadata for device switch locks
      if (isDeviceSwitchLock && user.deviceSwitchCount) {
        const lockMinutes = Math.ceil(remainingSeconds / 60);
        response.devicePolicy = {
          status: "locked",
          count: user.deviceSwitchCount,
          minutesLocked: lockMinutes,
        };
      }

      return res.status(423).json(response);
    }

    // ✅ SINGLE SESSION CHECK
    // login дээр user.sessionToken шинэчлэгддэг.
    // JWT-д sessionToken хадгалагдсан байдаг (genToken дээр чинь байгаа).
    const jwtSession = decoded.sessionToken || null;
    const dbSession = user.sessionToken || null;

    if (jwtSession !== dbSession) {
      return res.status(401).json({
        message: "Session expired. Дахин нэвтэрнэ үү.",
      });
    }

    // tokenVersion check to force logout existing tokens
    const jwtVersion = decoded.tokenVersion || 0;
    const dbVersion = user.tokenVersion || 0;
    if (jwtVersion !== dbVersion) {
      return res
        .status(401)
        .json({ message: "Session invalidated. Please login again." });
    }

    req.user = user.toObject({ getters: true });
    delete req.user.password;

    // Attach user info to audit context
    if (req.audit) {
      req.audit.user = {
        id: req.user._id || req.user.id,
        username: req.user.username,
        role: req.user.role,
      };
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token алдаатай" });
  }
};

exports.requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Нэвтэрсэн байх шаардлагатай" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Энэ үйлдэлд эрх хүрэхгүй байна" });
    }

    next();
  };
