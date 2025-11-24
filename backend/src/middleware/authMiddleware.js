const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: "Хэрэглэгч идэвхгүй байна" });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Token алдаатай" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Token олдсонгүй" });
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
