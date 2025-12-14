// src/utils/sendEmail.js
const nodemailer = require("nodemailer");

let transporterPromise = null;

function getEnv() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return { host, port, user, pass };
}

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const { host, port, user, pass } = getEnv();

    console.log("SMTP CONFIG =>", { host, port, user: user ? "***" : null });

    if (!host || !user || !pass) {
      throw new Error("SMTP env дутуу байна (SMTP_HOST/SMTP_USER/SMTP_PASS).");
    }

    // Reuse connections to reduce flakiness/latency under load
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 => true, 587 => false
      auth: { user, pass },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      // Timeouts help surface issues instead of hanging
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
    });

    // One-time verification (optional but very helpful in prod logs)
    try {
      await transporter.verify();
      console.log("✅ SMTP transporter verified");
    } catch (e) {
      console.error("❌ SMTP verify failed", e?.message || e);
      // Let it throw so caller can retry / queue can backoff
      throw e;
    }

    return transporter;
  })();

  return transporterPromise;
}

module.exports = async function sendEmail({ to, subject, html }) {
  const transporter = await getTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"Manhua.mn" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    // Helpful in debugging intermittent issues
    console.log("✅ Email sent", {
      to,
      messageId: info?.messageId,
      response: info?.response,
    });

    return info;
  } catch (e) {
    console.error("❌ Email send failed", {
      to,
      code: e?.code,
      response: e?.response,
      message: e?.message,
    });

    // Reset cached transporter so next attempt can recreate it
    transporterPromise = null;
    throw e;
  }
};
