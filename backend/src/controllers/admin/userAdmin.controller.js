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
    "preferredActivities",
    "workValues",
    "energyBoosts",
    "goingOut",
    "weekend",
    "hobby",
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
  const password = generateRandom
    ? crypto.randomBytes(6).toString("hex")
    : newPassword;

  const user = await User.findById(req.params.id).select("+password");
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  user.password = password;
  user.tokenVersion += 1;
  user.sessionToken = null;
  await user.save();

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "RESET_PASSWORD",
    before: {},
    after: { tokenVersion: user.tokenVersion },
    req,
  });

  return res.json({
    message: "Password reset successfully",
    temporaryPassword: generateRandom ? password : undefined,
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
