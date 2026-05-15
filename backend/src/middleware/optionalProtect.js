const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.optionalProtect = async (req, res, next) => {
  const auth = req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(decoded.id).select("-password");
    req.user = (user && user.isActive) ? user : null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
};
