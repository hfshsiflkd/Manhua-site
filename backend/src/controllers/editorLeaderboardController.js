const User = require("../models/User");
const Chapter = require("../models/Chapter");
const FinanceMonth = require("../models/FinanceMonth");

function parseMonthKey(monthKey) {
  const m = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function monthStartEnd({ year, month }) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); // exclusive
  return { start, end };
}

function getMonthKeyFromDate(d) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeToObjectMaybeMap(v) {
  if (!v) return null;
  if (v instanceof Map) return Object.fromEntries(v.entries());
  return v;
}

function getMonthlyViewsFromMonthlyMap(monthlyViewsObj, monthKey) {
  if (!monthlyViewsObj || typeof monthlyViewsObj !== "object") return 0;
  const n = Number(monthlyViewsObj[monthKey] || 0);
  return Number.isFinite(n) ? n : 0;
}

function sumMonthlyViewsFromDailyViews(dailyViewsObj, monthKey) {
  if (!dailyViewsObj || typeof dailyViewsObj !== "object") return 0;
  let sum = 0;
  for (const [k, v] of Object.entries(dailyViewsObj)) {
    if (typeof k === "string" && k.startsWith(`${monthKey}-`)) {
      const n = Number(v || 0);
      if (Number.isFinite(n)) sum += n;
    }
  }
  return sum;
}

// GET /api/editor/leaderboard?month=YYYY-MM
// Visible to editor + admin. Payout is based on chapter monthly views only.
exports.getEditorLeaderboard = async (req, res) => {
  const now = new Date();
  const defaultMonthKey = getMonthKeyFromDate(now);
  const monthKey = String(req.query.month || defaultMonthKey);

  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return res.status(400).json({ message: "Invalid month. Use YYYY-MM" });
  }
  const { start, end } = monthStartEnd(parsed);

  const financeMonth = await FinanceMonth.findOne({ monthKey }).lean();
  const totalRevenue = Number(financeMonth?.totalRevenue || 0);
  const currency = financeMonth?.currency || "MNT";
  const siteShare = totalRevenue * 0.3;
  const editorsPool = totalRevenue * 0.7;

  // include translators if they upload chapters; treat them as editors for leaderboard
  const editors = await User.find({ role: { $in: ["editor", "translator"] } })
    .select("_id username email role")
    .lean();
  const editorIds = editors.map((e) => e._id);

  const [chapCounts, chapters] = await Promise.all([
    Chapter.aggregate([
      { $match: { uploadedBy: { $in: editorIds }, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
    ]),
    Chapter.find({ uploadedBy: { $in: editorIds } })
      .select("_id uploadedBy monthlyViews dailyViews")
      .lean(),
  ]);

  const chaptersByEditor = new Map(chapCounts.map((x) => [String(x._id), x.count]));

  const chapterViewsByEditor = new Map(); // editorId -> monthly views
  for (const ch of chapters) {
    const editorId = String(ch.uploadedBy || "");
    if (!editorId) continue;
    const mv = normalizeToObjectMaybeMap(ch.monthlyViews);
    const dv = normalizeToObjectMaybeMap(ch.dailyViews);
    const monthly =
      getMonthlyViewsFromMonthlyMap(mv, monthKey) ||
      sumMonthlyViewsFromDailyViews(dv, monthKey);
    if (!monthly) continue;
    chapterViewsByEditor.set(editorId, (chapterViewsByEditor.get(editorId) || 0) + monthly);
  }

  const totalChapterViews = editors.reduce(
    (acc, e) => acc + (chapterViewsByEditor.get(String(e._id)) || 0),
    0
  );

  const rows = editors.map((e) => {
    const id = String(e._id);
    const chaptersUploaded = chaptersByEditor.get(id) || 0;
    const chapterMonthlyViews = chapterViewsByEditor.get(id) || 0;
    const share = totalChapterViews ? chapterMonthlyViews / totalChapterViews : 0;
    const payout = editorsPool ? editorsPool * share : 0;
    return {
      editor: { _id: e._id, username: e.username, email: e.email, role: e.role },
      chaptersUploaded,
      chapterMonthlyViews,
      share,
      payout,
    };
  });

  rows.sort((a, b) => {
    if (b.payout !== a.payout) return b.payout - a.payout;
    if (b.chapterMonthlyViews !== a.chapterMonthlyViews)
      return b.chapterMonthlyViews - a.chapterMonthlyViews;
    return String(a.editor.username || "").localeCompare(String(b.editor.username || ""));
  });

  rows.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return res.json({
    monthKey,
    currency,
    totalRevenue,
    siteShare,
    editorsPool,
    totalChapterViews,
    editors: rows,
  });
};

