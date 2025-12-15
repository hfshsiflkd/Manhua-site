const { protect } = require("./authMiddleware");

module.exports = [
  protect,
  (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }
    next();
  },
];

