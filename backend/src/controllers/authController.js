// src/controllers/authController.js
const { getClientIP } = require("../utils/ip");
const { registerUser, loginUser, getMe } = require("../services/authService");

const User = require("../models/User");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { enqueueEmail } = require("../queues/emailQueue");
const { genSessionToken } = require("../utils/token");
const { normalizeEmail } = require("../utils/normalize");
const { logAudit } = require("../utils/auditLogger");

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

    // Log successful registration
    if (req.audit && result.user) {
      req.audit.user = {
        id: result.user._id || result.user.id,
        username: result.user.username,
        role: result.user.role,
      };
      logAudit(req, {
        level: "INFO",
        category: "auth",
        action: "register_success",
        message: `User registered: ${result.user.username}`,
        meta: {
          username: result.user.username,
          email: result.user.email,
          hasTrial: !!result.trial,
        },
      });
    }

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
  // Declare identifier at function scope so it's accessible in catch block
  let identifier = "";

  try {
    noStore(res);

    // Destructure request body - support both identifier and legacy email/emailOrUsername fields
    const {
      identifier: bodyIdentifier,
      email,
      emailOrUsername,
      password,
      deviceId: bodyDeviceId,
    } = req.body;

    // Validate input - prioritize identifier field, fallback to emailOrUsername or email
    identifier = (bodyIdentifier || emailOrUsername || email || "").trim();
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

    // Log successful login
    if (req.audit && result.user) {
      req.audit.user = {
        id: result.user._id || result.user.id,
        username: result.user.username,
        role: result.user.role,
      };
      logAudit(req, {
        level: "INFO",
        category: "auth",
        action: "login_success",
        message: `User logged in: ${result.user.username}`,
        meta: {
          username: result.user.username,
          hasSecurityWarning: !!result.security?.warning,
        },
      });
    }

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
      // Log failed login (safe logging - no passwords, masked identifier)
      const maskedIdentifier = identifier
        ? identifier.length > 3
          ? identifier.substring(0, 3) + "***"
          : "***"
        : null;

      logAudit(req, {
        level: "WARN",
        category: "auth",
        action: "login_fail",
        message: `Login failed: ${err.message}`,
        meta: {
          identifier: maskedIdentifier,
          errorCode: err.code,
        },
      });

      const response = {
        success: false,
        message: err.message,
        ...(err.meta || {}),
      };
      if (err.code) response.code = err.code;
      return res.status(err.statusCode).json(response);
    }
    // Log unexpected errors for debugging (safe logging)
    console.error("Login error:", {
      message: err.message,
      stack: err.stack,
      identifier: identifier ? identifier.substring(0, 3) + "***" : "none",
    });
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

    const emailInput = String(req.body.email || req.body.identifier || "").trim();
    if (!emailInput) {
      return sendError(
        res,
        400,
        "Имэйл шаардлагатай.",
        "MISSING_EMAIL"
      );
    }

    // Normalize email: trim + lowercase
    const normalizedEmail = normalizeEmail(emailInput);

    // Validate email format
    if (!normalizedEmail.includes("@")) {
      return sendError(
        res,
        400,
        "Зөв имэйл хаяг оруулна уу.",
        "INVALID_EMAIL"
      );
    }

    // Find user by email with minimal select for performance
    // Email field has unique: true and index: true for fast lookup
    const user = await User.findOne({ email: normalizedEmail })
      .select("_id email username")
      .lean();

    // If user NOT found, return explicit 404 message
    if (!user) {
      // Log forgot password request for non-existent user
      logAudit(req, {
        level: "WARN",
        category: "auth",
        action: "forgot_password_requested",
        message: `Forgot password requested for non-existent email: ${normalizedEmail.substring(0, 3)}***`,
        meta: {
          emailPrefix: normalizedEmail.substring(0, 3),
        },
      });

      return res.status(404).json({
        ok: false,
        message: "Бүртгэлгүй хэрэглэгч байна.",
      });
    }

    // Rate limiting: 1 request per minute per user (in addition to middleware)
    const fullUser = await User.findById(user._id).select(
      "+resetPasswordRequestedAt +resetPasswordTokenHash +resetPasswordExpiresAt"
    );

    if (!fullUser) {
      return res.status(404).json({
        ok: false,
        message: "Бүртгэлгүй хэрэглэгч байна.",
      });
    }

    const now = Date.now();
    const last = fullUser.resetPasswordRequestedAt
      ? new Date(fullUser.resetPasswordRequestedAt).getTime()
      : 0;

    if (last && now - last < 60 * 1000) {
      return res.json({
        ok: true,
        message: "Сэргээх холбоос таны имэйл рүү илгээгдлээ.",
      });
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Set token fields (but don't save yet - only after email succeeds)
    fullUser.resetPasswordTokenHash = tokenHash;
    fullUser.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    fullUser.resetPasswordRequestedAt = new Date();

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    // Use userId in reset link
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}&id=${fullUser._id}`;

    try {
      await enqueueEmail({
        to: fullUser.email,
        subject: "Нууц үг сэргээх",
        html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Нууц үг сэргээх хүсэлт</h2>
          <p>Доорх товч дээр дарж нууц үгээ шинэчлээрэй (15 минут хүчинтэй).</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;border-radius:8px;text-decoration:none">
              Нууц үг сэргээх
            </a>
          </p>
          <p>Эсвэл энэ холбоосыг copy хийнэ үү:</p>
          <p style="word-break:break-all">${resetLink}</p>
          <p style="color:#666;font-size:12px">Хэрэв та энэ хүсэлтийг гаргаагүй бол үл тооно уу.</p>
        </div>
      `,
        text: `Нууц үг сэргээх холбоос (15 минут хүчинтэй): ${resetLink}`,
      });

      // Persist token only after email succeeds
    await fullUser.save();

    // Log forgot password request
    if (req.audit) {
      req.audit.user = {
        id: fullUser._id,
        username: fullUser.username,
        role: fullUser.role,
      };
      logAudit(req, {
        level: "INFO",
        category: "auth",
        action: "forgot_password_requested",
        message: `Password reset requested for user: ${fullUser.username}`,
        meta: {
          username: fullUser.username,
        },
      });
    }

    return res.json({
      ok: true,
      message: "Сэргээх холбоос таны имэйл рүү илгээгдлээ.",
    });
    } catch (emailErr) {
      console.error(
        "Forgot password email failed:",
        emailErr?.message || emailErr
      );
      // Rollback token fields so token is not usable if email failed
      fullUser.resetPasswordTokenHash = undefined;
      fullUser.resetPasswordExpiresAt = undefined;
      fullUser.resetPasswordRequestedAt = undefined;
      try {
        await fullUser.save();
      } catch (rollbackErr) {
        console.error(
          "Rollback reset token failed:",
          rollbackErr?.message || rollbackErr
        );
      }
      // Return error but don't reveal email existence
      return sendError(
        res,
        500,
        "Имэйл илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
        "EMAIL_SEND_FAILED"
      );
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    noStore(res);

    // Support both email and userId for reset
    const userId = req.body.id || req.body.userId;
    const email = req.body.email ? normalizeEmail(req.body.email) : null;
    const token = String(req.body.token || "").trim();
    const newPassword = String(
      req.body.newPassword || req.body.password || ""
    ).trim();

    if ((!userId && !email) || !token || !newPassword) {
      return sendError(
        res,
        400,
        "id (эсвэл email), token, newPassword шаардлагатай",
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

    // Build query - prefer userId if provided
    const query = userId
      ? { _id: userId, resetPasswordTokenHash: tokenHash }
      : { email, resetPasswordTokenHash: tokenHash };
    query.resetPasswordExpiresAt = { $gt: new Date() };

    const user = await User.findOne(query).select("+password");

    if (!user) {
      // Log failed reset attempt
      logAudit(req, {
        level: "WARN",
        category: "auth",
        action: "reset_password_fail",
        message: "Password reset failed: invalid or expired token",
        meta: {
          hasUserId: !!userId,
          hasEmail: !!email,
        },
      });

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

    // Log successful password reset
    if (req.audit) {
      req.audit.user = {
        id: user._id,
        username: user.username,
        role: user.role,
      };
      logAudit(req, {
        level: "INFO",
        category: "auth",
        action: "reset_password_success",
        message: `Password reset successful for user: ${user.username}`,
        meta: {
          username: user.username,
        },
      });
    }

    return sendSuccess(res, {}, "Нууц үг амжилттай шинэчлэгдлээ.");
  } catch (err) {
    console.error("Reset password error:", err);
    next(err);
  }
};
