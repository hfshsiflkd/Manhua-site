// src/controllers/authController.js
const { getClientIP } = require("../utils/ip");
const { registerUser, loginUser, getMe } = require("../services/authService");

const User = require("../models/User");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { enqueueEmail } = require("../queues/emailQueue");
const { genSessionToken } = require("../utils/token");

// ✅ no-store helper
function noStore(res) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization, Cookie");
}

function sha256(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// Helper to send consistent error responses
function sendError(res, statusCode, message, code = null, details = null) {
  const response = {
    success: false,
    message,
  };
  if (code) response.code = code;
  if (details) response.details = details;
  return res.status(statusCode).json(response);
}

// Helper to send success responses
function sendSuccess(res, data = {}, message = null) {
  const response = {
    success: true,
    ...data,
  };
  if (message) response.message = message;
  return res.json(response);
}

exports.register = async (req, res, next) => {
  try {
    noStore(res);

    const { username, email, password, deviceId: bodyDeviceId } = req.body;
    const deviceId = String(
      req.headers["x-device-id"] || bodyDeviceId || ""
    ).trim();
    const ip = getClientIP(req);

    // Validation
    if (!username || !email || !password) {
      return sendError(
        res,
        400,
        "Username, email, нууц үг шаардлагатай.",
        "MISSING_FIELDS"
      );
    }

    if (password.length < 8) {
      return sendError(
        res,
        400,
        "Нууц үг хамгийн багадаа 8 тэмдэгт байна.",
        "PASSWORD_TOO_SHORT"
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(
        res,
        400,
        "Зөв имэйл хаяг оруулна уу.",
        "INVALID_EMAIL_FORMAT"
      );
    }

    if (!deviceId) {
      return sendError(
        res,
        400,
        "Device мэдээлэл дутуу байна. (x-device-id шаардлагатай)",
        "MISSING_DEVICE_ID"
      );
    }

    const result = await registerUser({
      username,
      email,
      password,
      deviceId,
      ip,
    });

    return sendSuccess(
      res,
      {
        token: result.token,
        user: result.user,
        trial: result.trial,
      },
      "Амжилттай бүртгэгдлээ"
    );
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message, err.code || "ERROR");
    }
    console.error("Register error:", err);
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    noStore(res);

    const {
      email,
      emailOrUsername,
      password,
      deviceId: bodyDeviceId,
    } = req.body;

    // Validate input
    const identifier = (emailOrUsername || email || "").trim();
    if (!identifier) {
      return sendError(
        res,
        400,
        "Имэйл эсвэл хэрэглэгчийн нэр шаардлагатай.",
        "MISSING_IDENTIFIER"
      );
    }

    if (
      !password ||
      typeof password !== "string" ||
      password.trim().length === 0
    ) {
      return sendError(res, 400, "Нууц үг шаардлагатай.", "MISSING_PASSWORD");
    }

    const deviceId = String(
      req.get("x-device-id") || bodyDeviceId || ""
    ).trim();

    if (!deviceId) {
      return sendError(
        res,
        400,
        "Device мэдээлэл дутуу байна. (x-device-id шаардлагатай)",
        "MISSING_DEVICE_ID"
      );
    }

    const result = await loginUser({ identifier, password, deviceId });

    return sendSuccess(
      res,
      {
        token: result.token,
        user: result.user,
        security: result.security,
      },
      "Амжилттай нэвтэрлээ"
    );
  } catch (err) {
    // Handle known errors with statusCode
    if (err.statusCode) {
      const response = {
        success: false,
        message: err.message,
        ...(err.meta || {}),
      };
      if (err.code) response.code = err.code;
      return res.status(err.statusCode).json(response);
    }
    // Log unexpected errors for debugging
    console.error("Login error:", err);
    return next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    noStore(res);
    const me = await getMe(req.user.id);
    return sendSuccess(res, { user: me });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message, err.code || "ERROR");
    }
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    noStore(res);

    const identifier = String(
      req.body.email || req.body.identifier || ""
    ).trim();
    if (!identifier) {
      return sendError(
        res,
        400,
        "Имэйл эсвэл хэрэглэгчийн нэр шаардлагатай.",
        "MISSING_IDENTIFIER"
      );
    }

    // Don't leak whether email exists - always return same response
    const okResponse = () =>
      res.json({
        success: true,
        message:
          "Хэрэв энэ имэйл бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдэнэ.",
      });

    // Try to find user by email or username
    const identifierEmail = identifier.includes("@")
      ? normalizeEmail(identifier)
      : identifier.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: identifierEmail }, { username: identifier }],
    }).select(
      "+resetPasswordRequestedAt +resetPasswordTokenHash +resetPasswordExpiresAt +email"
    );

    if (!user) return okResponse();

    // Rate limiting: 1 request per minute
    const now = Date.now();
    const last = user.resetPasswordRequestedAt
      ? user.resetPasswordRequestedAt.getTime()
      : 0;

    if (last && now - last < 60 * 1000) return okResponse();

    // Use User model method to generate token (do not persist yet)
    const rawToken = user.createPasswordResetToken();

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    try {
      await enqueueEmail({
        to: user.email,
        subject: "Нууц үг сэргээх холбоос",
        html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Нууц үг сэргээх хүсэлт</h2>
          <p>Доорх товч дээр дарж нууц үгээ шинэчлээрэй (45 минут хүчинтэй).</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;border-radius:8px;text-decoration:none">
              Нууц үг сэргээх
            </a>
          </p>
          <p>Эсвэл энэ холбоосыг copy хийнэ үү:</p>
          <p>${resetLink}</p>
          <p style="color:#666;font-size:12px">Хэрэв та энэ хүсэлтийг гаргаагүй бол үл тооно уу.</p>
        </div>
      `,
        text: `Нууц үг сэргээх холбоос (45 минут хүчинтэй): ${resetLink}`,
      });

      // Persist token only after email succeeds
      await user.save();
    } catch (emailErr) {
      console.error(
        "Forgot password email failed:",
        emailErr?.message || emailErr
      );
      // Rollback token fields so token is not usable if email failed
      user.resetPasswordTokenHash = undefined;
      user.resetPasswordExpiresAt = undefined;
      user.resetPasswordRequestedAt = undefined;
      try {
        await user.save();
      } catch (rollbackErr) {
        console.error(
          "Rollback reset token failed:",
          rollbackErr?.message || rollbackErr
        );
      }
      // Always return generic success to avoid leaking existence
      return okResponse();
    }

    return okResponse();
  } catch (err) {
    console.error("Forgot password error:", err);
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    noStore(res);

    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || "").trim();
    const newPassword = String(
      req.body.newPassword || req.body.password || ""
    ).trim();

    if (!email || !token || !newPassword) {
      return sendError(
        res,
        400,
        "email, token, newPassword шаардлагатай",
        "MISSING_FIELDS"
      );
    }

    if (newPassword.length < 8) {
      return sendError(
        res,
        400,
        "Нууц үг хамгийн багадаа 8 тэмдэгт байна.",
        "PASSWORD_TOO_SHORT"
      );
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return sendError(
        res,
        400,
        "Token буруу эсвэл хугацаа дууссан байна.",
        "INVALID_OR_EXPIRED_TOKEN"
      );
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;

    // ✅ reset хийсэн бол бүх хуучин JWT автоматаар хүчингүй
    user.sessionToken = genSessionToken();

    // ✅ device-policy lock байвал тайлж өгье (reset = recovery)
    user.lockUntil = null;
    user.lockReason = null;

    // Invalidate reset token
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.resetPasswordRequestedAt = undefined;

    await user.save();

    return sendSuccess(res, {}, "Нууц үг амжилттай шинэчлэгдлээ.");
  } catch (err) {
    console.error("Reset password error:", err);
    next(err);
  }
};
