const { getClientIP } = require("../utils/ip");
const { registerUser, loginUser, getMe } = require("../services/authService");
const {
  requestPasswordReset,
  resetPasswordByToken,
} = require("../services/passwordResetService");

// ✅ HTTP cache бүрэн унтраах helper
function noStore(res) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  // auth header/cookie-оос хамаарах response гэдгийг proxy-д ойлгуулна
  res.setHeader("Vary", "Authorization, Cookie");
}

exports.register = async (req, res, next) => {
  try {
    noStore(res);

    const { username, email, password } = req.body;
    const deviceId = String(req.headers["x-device-id"] || "").trim();
    const ip = getClientIP(req);

    const result = await registerUser({
      username,
      email,
      password,
      deviceId,
      ip,
    });

    return res.json({
      message: "Амжилттай бүртгэгдлээ",
      token: result.token,
      user: result.user,
      trial: result.trial,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    noStore(res);

    const { email, emailOrUsername, password } = req.body;
    const identifier = (emailOrUsername || email || "").trim();
    const deviceId = String(req.headers["x-device-id"] || "").trim();

    const result = await loginUser({ identifier, password, deviceId });

    return res.json({
      message: "Амжилттай нэвтэрлээ",
      token: result.token,
      user: result.user,
      security: result.security,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        message: err.message,
        ...(err.meta || {}),
      });
    }
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    // ✅ хамгийн чухал нь ЭНД
    // /me-г browser/proxy хэзээ ч cache-дах ёсгүй
    noStore(res);

    const me = await getMe(req.user.id);
    return res.json(me);
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    noStore(res);

    const { emailOrUsername, email } = req.body;
    const identifier = String(emailOrUsername || email || "").trim();

    if (!identifier)
      return res.status(400).json({ message: "Email шаардлагатай" });

    const safeResponse = () =>
      res.json({
        message:
          "Хэрэв энэ имэйл/нэр бүртгэлтэй бол нууц үг сэргээх холбоос очно.",
      });

    await requestPasswordReset(identifier);
    return safeResponse();
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    noStore(res);

    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token болон шинэ нууц үг шаардлагатай" });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "Нууц үг хамгийн багадаа 6 тэмдэгт" });
    }

    await resetPasswordByToken({ token, password });
    return res.json({ message: "Нууц үг амжилттай солигдлоо" });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};
