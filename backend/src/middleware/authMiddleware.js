const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer"))
    return res.status(401).json({ message: "Нэвтэрсэн байх шаардлагатай" });

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });

    // 🔥 ШАЛГАХ: DB sessionToken === JWT sessionToken
    if (user.sessionToken !== decoded.sessionToken) {
      return res.status(401).json({
        message: "Таны аккаунт өөр төхөөрөмж дээр ашиглагдсан. Дахин нэвтэрнэ үү.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Токен хүчингүй байна" });
  }
};
