const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const FinanceMonth = require("../../models/FinanceMonth");
const { writeAudit } = require("../../utils/audit");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

function addMonthsSafe(date, months) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) d.setDate(0);
  return d;
}

const ALLOWED_SORTS = new Set([
  "createdAt", "-createdAt",
  "username", "-username",
  "email", "-email",
  "role", "-role",
  "vipExpiresAt", "-vipExpiresAt",
  "blocked", "-blocked",
]);

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
    const safe = escapeRegex(query.q);
    filter.$or = [
      { username: new RegExp(safe, "i") },
      { email: new RegExp(safe, "i") },
      { phone: new RegExp(safe, "i") },
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

function getMonthKeyFromDate(d) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

exports.listUsers = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const sort = ALLOWED_SORTS.has(req.query.sort) ? req.query.sort : "-createdAt";
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
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
  const user = await User.findById(req.params.id).select(
    "-password -resetPasswordTokenHash -resetPasswordExpiresAt -resetPasswordRequestedAt"
  );
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
  return res.json(buildSafeUser(user));
};

exports.updateUser = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
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

// POST /api/admin/users/:id/vip
// body: { months: number, amount?: number, paidAt?: string|Date, note?: string, vipLevel?: number }
// Extends VIP and (optionally) records revenue into monthly finance ledger based on paidAt month.
exports.grantVip = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
  const { months, amount, paidAt, note, vipLevel } = req.body || {};
  const monthsNum = Number(months ?? 1);

  if (!Number.isFinite(monthsNum) || monthsNum <= 0 || monthsNum > 120) {
    return res
      .status(400)
      .json({ message: "months нь 1-120 хооронд тоо байх ёстой" });
  }

  let amountNum = undefined;
  if (amount !== undefined) {
    amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return res.status(400).json({ message: "amount must be a number >= 0" });
    }
  }

  let paidAtDate = null;
  if (paidAt !== undefined && paidAt !== null && String(paidAt).trim() !== "") {
    const d = new Date(paidAt);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: "paidAt must be a valid date" });
    }
    paidAtDate = d;
  } else {
    paidAtDate = new Date();
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

  const before = buildSafeUser(user);
  const now = new Date();
  const base =
    user.vipExpiresAt && new Date(user.vipExpiresAt) > now
      ? new Date(user.vipExpiresAt)
      : now;
  const newExp = addMonthsSafe(base, monthsNum);

  user.vipExpiresAt = newExp;
  user.isVIP = true;
  if (vipLevel !== undefined) user.vipLevel = Number(vipLevel) || 0;
  await user.save();

  let financeUpdated = null;
  if (amountNum !== undefined && amountNum > 0) {
    const monthKey = getMonthKeyFromDate(paidAtDate);
    financeUpdated = await FinanceMonth.findOneAndUpdate(
      { monthKey },
      {
        $inc: { totalRevenue: amountNum },
        $push: {
          revenueEvents: {
            userId: user._id,
            adminId: req.user.id || req.user._id,
            amount: amountNum,
            currency: "MNT",
            paidAt: paidAtDate,
            monthsGranted: monthsNum,
            note: typeof note === "string" ? note : "",
          },
        },
        $setOnInsert: { currency: "MNT" },
      },
      { new: true, upsert: true }
    ).lean();
  }

  await writeAudit({
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    action: "GRANT_VIP",
    before,
    after: buildSafeUser(user),
    req,
  });

  return res.json({
    user: buildSafeUser(user),
    financeMonth: financeUpdated
      ? {
          monthKey: financeUpdated.monthKey,
          totalRevenue: financeUpdated.totalRevenue,
          currency: financeUpdated.currency,
        }
      : null,
  });
};

exports.resetPassword = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
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
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
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
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
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
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
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
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
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
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID буруу байна" });
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
