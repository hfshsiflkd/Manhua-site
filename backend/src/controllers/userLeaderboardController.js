const FinanceMonth = require("../models/FinanceMonth");
const User = require("../models/User");

function parseMonthKey(monthKey) {
  if (!monthKey || typeof monthKey !== "string") return null;
  const m = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

// GET /api/leaderboard/users?limit=20&month=YYYY-MM
// Returns users ranked by total money spent (from FinanceMonth revenue events).
exports.getUserSpenderLeaderboard = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const monthKey = req.query.month ? String(req.query.month) : null;

  if (monthKey && !parseMonthKey(monthKey)) {
    return res.status(400).json({ message: "Invalid month. Use YYYY-MM" });
  }

  const matchMonth = monthKey ? { monthKey } : {};

  // Aggregate spends from revenueEvents.userId
  const rows = await FinanceMonth.aggregate([
    { $match: matchMonth },
    { $unwind: "$revenueEvents" },
    { $match: { "revenueEvents.userId": { $exists: true, $ne: null } } },
    {
      $group: {
        _id: "$revenueEvents.userId",
        totalSpent: { $sum: "$revenueEvents.amount" },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: limit * 3 }, // allow filtering by role after lookup
    {
      $lookup: {
        from: User.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    // Only real users (exclude admin/editor/translator)
    { $match: { "user.role": "user" } },
    { $project: { _id: 0, userId: "$user._id", username: "$user.username", totalSpent: 1 } },
    { $limit: limit },
  ]);

  return res.json({
    scope: monthKey ? "month" : "all_time",
    monthKey: monthKey || null,
    currency: "MNT",
    users: rows.map((r, idx) => ({
      rank: idx + 1,
      user: { _id: r.userId, username: r.username },
      totalSpent: Number(r.totalSpent || 0),
    })),
  });
};

