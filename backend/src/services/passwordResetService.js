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

  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashed = hashToken(rawToken);

  user.resetPasswordToken = hashed;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  // ✅ зөв domain (login хавчуулахгүй)
  const origin = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${origin}/reset-password?token=${rawToken}`;

  // ✅ debug (түр)
  console.log("[forgot] raw last6:", rawToken.slice(-6));
  console.log("[forgot] hashed last6:", hashed.slice(-6));

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Нууц үг сэргээх</h2>
      <p>Доорх холбоосоор орж нууц үгээ шинэчилнэ үү. (15 минут хүчинтэй)</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Хэрэв та энэ хүсэлтийг хийгээгүй бол үл тоомсорлоорой.</p>
    </div>
  `;

  await enqueueEmail({ to: user.email, subject: "Reset password", html });
}

async function resetPasswordByToken({ token, password }) {
  const raw = String(token || "").trim();
  const hashed = hashToken(raw);

  console.log("[reset] raw last6:", raw.slice(-6));
  console.log("[reset] hashed last6:", hashed.slice(-6));

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error("Token хүчингүй эсвэл хугацаа дууссан");
    err.statusCode = 400;
    throw err;
  }

  user.password = password; // pre-save hash байвал OK
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();
  return true;
}

module.exports = { requestPasswordReset, resetPasswordByToken };
