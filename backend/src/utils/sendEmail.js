// src/utils/sendEmail.js
const nodemailer = require("nodemailer");

let transporterPromise = null;

function getEnv() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || (user ? `"Manhua.mn" <${user}>` : undefined);
  const resendKey = process.env.RESEND_API_KEY || "";
  const resendFrom = process.env.RESEND_FROM || from;
  return { host, port, user, pass };
}

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const { host, port, user, pass, from } = getEnv();

    console.log("SMTP CONFIG =>", {
      host,
      port,
      user: user ? "***" : null,
      from: from || null,
    });

    if (!host || !user || !pass) {
      throw new Error("SMTP env дутуу байна (SMTP_HOST/SMTP_USER/SMTP_PASS).");
    }

    // Reuse connections to reduce flakiness/latency under load
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 => true, 587 => false (STARTTLS)
      auth: { user, pass },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      // Timeouts help surface issues instead of hanging
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
      tls: {
        // Helps some providers behind TLS inspection
        servername: host,
      },
    });

    // One-time verification (optional but very helpful in prod logs)
    if (process.env.NODE_ENV === "production") {
      try {
        await transporter.verify();
        console.log("✅ SMTP transporter verified");
      } catch (e) {
        console.error("❌ SMTP verify failed", e?.message || e);
        // Let it throw so caller can retry / queue can backoff
        throw e;
      }
    }

    return transporter;
  })();

  return transporterPromise;
}

async function sendWithSMTP({ to, subject, html }) {
  const transporter = await getTransporter();

  try {
    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        (process.env.SMTP_USER ? `"Arc-Read.com" <${process.env.SMTP_USER}>` : undefined),
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
}

async function sendWithResend({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY дутуу байна");

  const from =
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    (process.env.SMTP_USER
      ? `"Arc-Read.com" <${process.env.SMTP_USER}>`
      : undefined);

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend API failed: ${resp.status} ${text}`);
  }

  return resp.json();
}

module.exports = async function sendEmail(payload) {
  const { to, subject, html } = payload;

  // Try SMTP first
  try {
    return await sendWithSMTP({ to, subject, html });
  } catch (smtpErr) {
    console.error("SMTP send failed, trying fallback provider if available:", smtpErr?.message || smtpErr);
    // If fallback is configured, try Resend
    if (process.env.RESEND_API_KEY) {
      try {
        return await sendWithResend({ to, subject, html });
      } catch (fallbackErr) {
        console.error("Fallback email provider failed:", fallbackErr?.message || fallbackErr);
        throw fallbackErr;
      }
    }
    // Rethrow original SMTP error if no fallback
    throw smtpErr;
  }
};
