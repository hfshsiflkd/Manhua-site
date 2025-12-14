// src/utils/sendEmail.js
const nodemailer = require("nodemailer");

module.exports = async ({ to, subject, html }) => {
  // ✅ env шалгах
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log("SMTP CONFIG =>", { host, port, user: user ? "***" : null });

  if (!host || !user || !pass) {
    throw new Error("SMTP env дутуу байна (SMTP_HOST/SMTP_USER/SMTP_PASS).");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // ✅ 465 бол true, 587 бол false
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Manhua.mn" <${user}>`,
    to,
    subject,
    html,
  });
};
