const crypto = require("crypto");
const User = require("../models/User");
const { enqueueEmail } = require("../queues/emailQueue");
const sendEmail = require("../utils/sendEmail");
const hashToken = require("../utils/hashToken");

module.exports = async function requestPasswordReset(identifier) {
  const idEmail = identifier.includes("@")
    ? identifier.toLowerCase()
    : identifier;

  const user = await User.findOne({
    $or: [{ email: idEmail }, { username: identifier }],
  });
  if (!user) return;

  // ✅ Cooldown: token саяхан үүссэн бол дахиж шинэчлэхгүй (хуучин email хүчинтэй хэвээр)
  const now = Date.now();
  if (
    user.resetPasswordToken &&
    user.resetPasswordExpires &&
    user.resetPasswordExpires.getTime() - now > 29 * 60 * 1000
  ) {
    console.log("[forgot] cooldown hit — skip generating new token");
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashed = hashToken(rawToken);

  user.resetPasswordToken = hashed;
  user.resetPasswordExpires = new Date(now + 30 * 60 * 1000);
  await user.save();

  const origin = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${origin}/reset-password?token=${rawToken}`;

  console.log(
    "[forgot] to:",
    user.email,
    "raw last6:",
    rawToken.slice(-6),
    "hashed last6:",
    hashed.slice(-6)
  );

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Нууц үг сэргээх</h2>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>(30 минут хүчинтэй)</p>
    </div>
  `;

  // ✅ 1) Queue
  try {
    const job = await enqueueEmail({
      to: user.email,
      subject: "Reset password",
      html,
    });
    console.log("[forgot] email enqueued", job?.id);
    return;
  } catch (e) {
    console.error("[forgot] enqueue failed, fallback SMTP:", e?.message || e);
  }

  // ✅ 2) Fallback SMTP
  try {
    await sendEmail({ to: user.email, subject: "Reset password", html });
    console.log("[forgot] fallback SMTP sent");
  } catch (e) {
    console.error("[forgot] fallback SMTP failed:", e?.message || e);
  }
};
