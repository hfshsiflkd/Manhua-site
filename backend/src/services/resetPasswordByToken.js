const User = require("../models/User");
const hashToken = require("../utils/hashToken");

module.exports = async function resetPasswordByToken({ token, password }) {
  const raw = String(token || "").trim();
  const hashed = hashToken(raw);

  console.log(
    "[reset] raw last6:",
    raw.slice(-6),
    "hashed last6:",
    hashed.slice(-6)
  );

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error(
      "Token хүчингүй/хугацаа дууссан. Forgot password-оо дахин хийж хамгийн сүүлд ирсэн email-ийг ашиглаарай."
    );
    err.statusCode = 400;
    throw err;
  }

  // ✅ RAW password өг — хэрвээ schema pre('save') hash хийдэг бол зөв ажиллана
  user.password = String(password);

  // ✅ token нэг удаагийн
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();
};
