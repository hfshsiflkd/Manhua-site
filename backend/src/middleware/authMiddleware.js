const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { get: cacheGet, set: cacheSet, del: cacheDel } = require("../cache/redisCache");

const USER_CACHE_TTL = 60; // seconds

function cacheKey(userId) {
  return `auth:user:${userId}`;
}

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    const key = cacheKey(decoded.id);
    let user = await cacheGet(key);

    // Cache hit but sessionToken changed (new login) → re-fetch
    if (user && user.sessionToken !== (decoded.sessionToken || null)) {
      user = null;
    }

    if (!user) {
      user = await User.findById(decoded.id)
        .select("-bookmarks -recentlyViewed")
        .lean();
      if (user) {
        cacheSet(key, user, USER_CACHE_TTL).catch(() => {});
      }
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    // LOCK CHECK
    const now = Date.now();
    if (user.lockUntil && new Date(user.lockUntil).getTime() > now) {
      const lockUntil = new Date(user.lockUntil);
      const remainingSeconds = Math.ceil((lockUntil.getTime() - now) / 1000);

      const isDeviceSwitchLock = user.lockReason === "Too many device switches";
      const response = {
        success: false,
        message: "Түр түгжигдсэн. Дахин оролдоно уу.",
        code: isDeviceSwitchLock ? "DEVICE_SWITCH_LOCK" : user.lockReason || "LOCKED",
        lockUntil: lockUntil.toISOString(),
        remainingSeconds,
        reason: user.lockReason || "LOCKED",
      };

      if (isDeviceSwitchLock && user.deviceSwitchCount) {
        response.devicePolicy = {
          status: "locked",
          count: user.deviceSwitchCount,
          minutesLocked: Math.ceil(remainingSeconds / 60),
        };
      }

      return res.status(423).json(response);
    }

    // SINGLE SESSION CHECK
    const jwtSession = decoded.sessionToken || null;
    const dbSession = user.sessionToken || null;
    if (jwtSession !== dbSession) {
      return res.status(401).json({ message: "Session expired. Дахин нэвтэрнэ үү." });
    }

    // tokenVersion check
    const jwtVersion = decoded.tokenVersion || 0;
    const dbVersion = user.tokenVersion || 0;
    if (jwtVersion !== dbVersion) {
      return res.status(401).json({ message: "Session invalidated. Please login again." });
    }

    req.user = user;

    if (req.audit) {
      req.audit.user = {
        id: req.user._id || req.user.id,
        username: req.user.username,
        role: req.user.role,
      };
    }

    next();
  } catch {
    return res.status(401).json({ message: "Token алдаатай" });
  }
};

// /auth/me зэрэг зөвхөн профайл буцаадаг endpoint-д ашиглана.
// DB/Redis дуудахгүй — JWT payload-аас шууд буцаана (<5ms).
exports.protectLight = (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return res.status(401).json({ message: "Token олдсонгүй" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    req.user = decoded;

    if (req.audit) {
      req.audit.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    }
    next();
  } catch {
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
      return res.status(403).json({ message: "Энэ үйлдэлд эрх хүрэхгүй байна" });
    }
    next();
  };

// Call after login/password-change/role-change/ban so the next request re-fetches from DB.
// IMPORTANT: returns a promise — `await` it before sending response so the cache is truly cleared.
exports.invalidateUserCache = async (userId) => {
  try {
    await cacheDel(cacheKey(userId));
  } catch {
    // Redis алдаа гарвал TTL дуустал хүлээнэ — silent
  }
};
