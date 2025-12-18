const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const { writeAudit } = require("../../utils/audit");

function buildSafeUser(user) {
  const safe = user.toObject();
  delete safe.password;
  delete safe.resetPasswordTokenHash;
  delete safe.resetPasswordExpiresAt;
  delete safe.resetPasswordRequestedAt;
  return safe;
}

function applySearchFilters(query) {
  const filter = {};
  if (query.q) {
    filter.$or = [
      { username: new RegExp(query.q, "i") },
      { email: new RegExp(query.q, "i") },
      { phone: new RegExp(query.q, "i") },
    ];
  }
  if (query.role) filter.role = query.role;
  if (typeof query.vip === "boolean") filter.isVIP = query.vip;
  if (typeof query.blocked === "boolean") filter.blocked = query.blocked;

  // Filter by locked status
  if (typeof query.locked === "boolean") {
    const now = new Date();
    if (query.locked === true) {
      // User is locked if lockUntil exists and is in the future
      filter.lockUntil = { $exists: true, $gt: now };
    } else {
      // User is not locked if lockUntil doesn't exist or is in the past
      filter.$or = [
        { lockUntil: { $exists: false } },
        { lockUntil: null },
        { lockUntil: { $lte: now } },
      ];
    }
  }

  return filter;
}

function parseBool(val) {
  if (val === undefined) return undefined;
  if (val === true || val === false) return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return undefined;
}

exports.listUsers = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const sort = req.query.sort || "-createdAt";
  const filter = applySearchFilters({
    ...req.query,
    vip: parseBool(req.query.vip),
    blocked: parseBool(req.query.blocked),
  });

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({ message: "Invalid page" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ message: "Invalid limit" });
  }
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter)
      .select(
        "-password -resetPasswordTokenHash -resetPasswordExpiresAt -resetPasswordRequestedAt"
      )
      .sort(sort)
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "-password -resetPasswordTokenHash -resetPasswordExpiresAt -resetPasswordRequestedAt"
  );
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
  return res.json(buildSafeUser(user));
};

exports.updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  const before = buildSafeUser(user);
  const fields = [
    "username",
    "email",
    "phone",
    "role",
    "vipExpiresAt",
    "vipLevel",
    "blocked",
    "isActive",
  ];

  fields.forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });

  user.isVIP = !!user.vipExpiresAt && new Date(user.vipExpiresAt) > new Date();

  await user.save();

  const after = buildSafeUser(user);
  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "UPDATE_USER",
    before,
    after,
    req,
  });

  res.json(after);
};

exports.resetPassword = async (req, res) => {
  const { newPassword, generateRandom } = req.body;
  if (!newPassword && !generateRandom) {
    return res
      .status(400)
      .json({ message: "newPassword required or generateRandom=true" });
  }
  if (
    newPassword &&
    (typeof newPassword !== "string" || newPassword.length < 8)
  ) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }
  const plainPassword = generateRandom
    ? crypto.randomBytes(6).toString("hex")
    : newPassword;

  const user = await User.findById(req.params.id).select("+password");
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  // ✅ FIX: Ensure password is always hashed correctly
  // Problem: Pre-save hook might not run if password isn't detected as modified
  // Solution: Use updateOne to bypass hooks and manually hash the password
  // This guarantees the password is always hashed, regardless of hook behavior
  
  // Hash the password manually using bcrypt (same as pre-save hook)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  
  // Use updateOne to bypass pre-save hook and set hashed password directly
  // This ensures the password is always hashed correctly
  const newTokenVersion = (user.tokenVersion || 0) + 1;
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        tokenVersion: newTokenVersion,
        sessionToken: null,
      },
    }
  );

  // Verify password was saved correctly (safety check)
  const verifyUser = await User.findById(user._id).select("+password");
  if (!verifyUser || !verifyUser.password.startsWith("$2")) {
    console.error("[SECURITY ERROR] Password was not hashed after admin reset!", {
      userId: user._id,
      username: user.username,
    });
    return res.status(500).json({ 
      message: "Password reset failed - security error. Please try again." 
    });
  }

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "RESET_PASSWORD",
    before: {},
    after: { tokenVersion: newTokenVersion },
    req,
  });

  return res.json({
    message: "Password reset successfully",
    temporaryPassword: generateRandom ? plainPassword : undefined,
  });
};

exports.forceLogout = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  user.tokenVersion += 1;
  user.sessionToken = null;
  await user.save();

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "FORCE_LOGOUT",
    before: {},
    after: { tokenVersion: user.tokenVersion },
    req,
  });

  return res.json({ message: "User logged out on all devices" });
};

exports.blockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  const before = buildSafeUser(user);
  user.blocked = true;
  user.isActive = false;
  user.tokenVersion += 1;
  user.sessionToken = null;
  await user.save();

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "BLOCK_USER",
    before,
    after: buildSafeUser(user),
    req,
  });

  return res.json(buildSafeUser(user));
};

exports.unblockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  const before = buildSafeUser(user);
  user.blocked = false;
  user.isActive = true;
  await user.save();

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "UNBLOCK_USER",
    before,
    after: buildSafeUser(user),
    req,
  });

  return res.json(buildSafeUser(user));
};

exports.lockUser = async (req, res) => {
  const { reason, minutes } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  if (!reason || typeof reason !== "string") {
    return res.status(400).json({ message: "reason is required (string)" });
  }

  const lockMinutes = Number(minutes) || 60; // Default 1 hour
  if (lockMinutes < 1 || lockMinutes > 10080) {
    return res
      .status(400)
      .json({ message: "minutes must be between 1 and 10080 (7 days)" });
  }

  const before = buildSafeUser(user);
  const now = Date.now();
  user.lockUntil = new Date(now + lockMinutes * 60 * 1000);
  user.lockReason = reason;
  user.tokenVersion += 1; // Force logout
  user.sessionToken = null;
  await user.save();

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "LOCK_USER",
    before,
    after: buildSafeUser(user),
    req,
  });

  return res.json(buildSafeUser(user));
};

exports.unlockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  const before = buildSafeUser(user);
  user.lockUntil = null;
  user.lockReason = "";
  user.deviceSwitchWindowStart = null;
  user.deviceSwitchCount = 0;
  await user.save();

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "UNLOCK_USER",
    before,
    after: buildSafeUser(user),
    req,
  });

  return res.json(buildSafeUser(user));
};
