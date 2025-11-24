// middleware/roleMiddleware.js
module.exports =
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
