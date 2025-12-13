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

    // user-г авна
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Хэрэглэгч идэвхгүй байна" });
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

    req.user = user;
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
