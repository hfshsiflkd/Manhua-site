// src/services/authService.js
const bcrypt = require("bcrypt");
const User = require("../models/User");

const { normalizeEmail, normalizeUsername } = require("../utils/normalize");
const { computeIsVIP } = require("../utils/vip");
const { genSessionToken, genJwt } = require("../utils/token");
const { applyTrialVIP } = require("./trialService");
const { applyDeviceSwitchPolicy } = require("./devicePolicyService");

function nowMs() {
  return Date.now();
}

async function registerUser({ username, email, password, deviceId, ip }) {
  if (!username || !email || !password) {
    const err = new Error("Username, email, нууц үг шаардлагатай.");
    err.statusCode = 400;
    throw err;
  }
  if (!deviceId) {
    const err = new Error(
      "Device мэдээлэл дутуу байна. (x-device-id header шаардлагатай)"
    );
    err.statusCode = 400;
    throw err;
  }

  const normEmail = normalizeEmail(email);
  const normUsername = normalizeUsername(username);

  if (await User.findOne({ email: normEmail })) {
    const err = new Error("Энэ email аль хэдийн бүртгэлтэй.");
    err.statusCode = 400;
    throw err;
  }

  if (await User.findOne({ username: normUsername })) {
    const err = new Error("Энэ username аль хэдийн бүртгэлтэй.");
    err.statusCode = 400;
    throw err;
  }

  // Password will be hashed by pre-save hook in User model
  const user = await User.create({
    username: normUsername,
    email: normEmail,
    password: password, // Pre-save hook will hash this
    role: "user",

    isVIP: false,
    vipExpiresAt: null,

    sessionToken: genSessionToken(),

    deviceId,
    lastRegisterIP: ip,

    hasUsedTrial: false,
    trialGrantedAt: null,
  });

  const { trialGranted } = await applyTrialVIP({ user, deviceId, ip });

  user.isVIP = computeIsVIP(user);
  await user.save();

  const token = genJwt(user);

  return {
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVIP: user.isVIP,
      vipExpiresAt: user.vipExpiresAt,
      hasUsedTrial: user.hasUsedTrial,
      trialGrantedAt: user.trialGrantedAt,
    },
    trial: { granted: trialGranted },
  };
}

async function loginUser({ identifier, password, deviceId }) {
  if (!identifier || !password) {
    const err = new Error("Имэйл/нэр болон нууц үг шаардлагатай.");
    err.statusCode = 400;
    throw err;
  }
  if (!deviceId) {
    const err = new Error(
      "Device мэдээлэл дутуу байна. (x-device-id шаардлагатай)"
    );
    err.statusCode = 400;
    throw err;
  }

  const identifierEmail = identifier.includes("@")
    ? identifier.toLowerCase()
    : identifier;

  // ✅ password select:false байж магадгүй
  const user = await User.findOne({
    $or: [{ email: identifierEmail }, { username: identifier }],
  }).select("+password");

  if (!user) {
    const err = new Error("Нэвтрэх мэдээлэл буруу байна.");
    err.statusCode = 400;
    throw err;
  }

  // Check lock status
  const now = Date.now();
  if (user.lockUntil && new Date(user.lockUntil).getTime() > now) {
    const lockUntil = new Date(user.lockUntil);
    const remainingSeconds = Math.ceil((lockUntil.getTime() - now) / 1000);
    const err = new Error("Түр түгжигдсэн. Дахин оролдоно уу.");
    err.statusCode = 423; // 423 Locked
    err.meta = {
      lockUntil: lockUntil.toISOString(),
      reason: user.lockReason || "LOCKED",
      remainingSeconds,
    };
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err = new Error("Нэвтрэх мэдээлэл буруу байна.");
    err.statusCode = 400;
    throw err;
  }

  const policy = await applyDeviceSwitchPolicy({ user, deviceId });

  // If locked, throw 423 with devicePolicy metadata
  if (policy.locked) {
    const lockUntil = new Date(policy.lockUntil);
    const remainingSeconds =
      policy.remainingSeconds || Math.ceil((lockUntil.getTime() - now) / 1000);
    const err = new Error(
      "Олон төхөөрөмжөөс давтамжтай нэвтрэх оролдлого илэрсэн тул түр түгжлээ."
    );
    err.statusCode = 423; // 423 Locked
    err.meta = {
      code: "DEVICE_SWITCH_LOCK",
      lockUntil: lockUntil.toISOString(),
      reason: policy.reason || "Too many device switches",
      remainingSeconds,
      devicePolicy: policy.devicePolicy,
    };
    throw err;
  }

  user.sessionToken = genSessionToken();

  const isVIP = computeIsVIP(user);
  if (user.isVIP !== isVIP) user.isVIP = isVIP;

  await user.save();

  const token = genJwt(user);

  // Include devicePolicy warning in response if present
  const response = {
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVIP: user.isVIP,
      vipExpiresAt: user.vipExpiresAt,
    },
    security: {
      deviceId,
      switched: policy.switched,
      switchCount: policy.switchCount,
      windowStart: policy.windowStart,
    },
  };

  // Add devicePolicy warning if present
  if (policy.devicePolicy && policy.devicePolicy.status === "warning") {
    response.devicePolicy = policy.devicePolicy;
  }

  return response;
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Хэрэглэгч олдсонгүй");
    err.statusCode = 404;
    throw err;
  }

  const isVIP = computeIsVIP(user);
  if (user.isVIP !== isVIP) {
    user.isVIP = isVIP;
    await user.save();
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    isVIP: user.isVIP,
    vipExpiresAt: user.vipExpiresAt,
    avatar: user.avatar || null,
  };
}

module.exports = { registerUser, loginUser, getMe };
