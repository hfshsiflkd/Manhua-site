const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.optionalProtect = async (req, res, next) => {
  const auth = req.headers.authorization || "";
  const debug = String(process.env.DEBUG_AUTH || "").toLowerCase() === "true";
  if (debug) {
    console.log("[optionalProtect] hit", {
      path: req.originalUrl,
      hasAuth: !!auth,
      startsBearer: auth.startsWith("Bearer "),
    });
  }

  if (!auth.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (debug) console.log("[optionalProtect] decoded", decoded);

    const user = await User.findById(decoded.id).select("-password");
    if (debug) {
      console.log("[optionalProtect] user found?", {
        found: !!user,
        id: user?._id?.toString(),
        vipExpiresAt: user?.vipExpiresAt,
        isActive: user?.isActive,
      });
    }

    // ⚠️ isActive байхгүй бол үргэлж null болно
    req.user = user ? user : null;

    return next();
  } catch (e) {
    if (debug) console.log("[optionalProtect] error", e?.message);
    req.user = null;
    return next();
  }
};
