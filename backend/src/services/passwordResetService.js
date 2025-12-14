const crypto = require("crypto");
const User = require("../models/User");
const { enqueueEmail } = require("../queues/emailQueue");
const { hashToken } = require("../utils/token");

async function requestPasswordReset(identifier) {
  const idEmail = identifier.includes("@")
    ? identifier.toLowerCase()
    : identifier;

  const user = await User.findOne({
    $or: [{ email: idEmail }, { username: identifier }],
  });

  if (!user) return; // controller safeResponse буцаана

  const rawToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = hashToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

  await user.save();

  const baseUrl =
    process.env.FRONTEND_URL_RESET_PASSWORD || "http://localhost:3000/login";

  const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Нууц үг сэргээх</h2>
      <p>Доорх холбоосоор орж нууц үгээ шинэчилнэ үү. (15 минут хүчинтэй)</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Хэрэв та энэ хүсэлтийг хийгээгүй бол үл тоомсорлоорой.</p>
    </div>
  `;

  await enqueueEmail({
    to: user.email,
    subject: "Reset password",
    html,
  });
}

async function resetPasswordByToken({ token, password }) {
  const hashed = hashToken(String(token));

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error("Token хүчингүй эсвэл хугацаа дууссан");
    err.statusCode = 400;
    throw err;
  }

  // ✅ Хэрвээ User schema дээр pre('save') hash хийдэг бол ингэж болно
  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();

  return true;
}

module.exports = { requestPasswordReset, resetPasswordByToken };
