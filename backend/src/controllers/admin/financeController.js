const User = require("../../models/User");
const Chapter = require("../../models/Chapter");
const Manhua = require("../../models/Manhua");
const FinanceMonth = require("../../models/FinanceMonth");

function parseMonthKey(monthKey) {
  // Expected: YYYY-MM
  if (!monthKey || typeof monthKey !== "string") return null;
  const m = monthKey.match(/^(\d{4})-(\d{2})$/);
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

function sumMonthlyViewsFromDailyViews(dailyViewsObj, monthKey) {
  if (!dailyViewsObj || typeof dailyViewsObj !== "object") return 0;
  let sum = 0;
  for (const [k, v] of Object.entries(dailyViewsObj)) {
    // k like "2024-12-16"
    if (typeof k === "string" && k.startsWith(`${monthKey}-`)) {
      const n = Number(v || 0);
      if (Number.isFinite(n)) sum += n;
    }
  }
  return sum;
}

function normalizeToObjectMaybeMap(v) {
  // Mongoose Map can come back as Map or plain object; lean usually gives plain object.
  if (!v) return null;
  if (v instanceof Map) return Object.fromEntries(v.entries());
  return v;
}

// GET /api/admin/finance?month=YYYY-MM
exports.getMonthlyFinance = async (req, res) => {
  const now = new Date();
  const defaultMonthKey = getMonthKeyFromDate(now);
  const monthKey = String(req.query.month || defaultMonthKey);

  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return res.status(400).json({ message: "Invalid month. Use YYYY-MM" });
  }

  const { start, end } = monthStartEnd(parsed);

  // Revenue ledger for month (money paid to site)
  const financeMonth = await FinanceMonth.findOne({ monthKey }).lean();
  const totalRevenue = Number(financeMonth?.totalRevenue || 0);
  const currency = financeMonth?.currency || "MNT";

  const siteShare = totalRevenue * 0.3;
  const editorsPool = totalRevenue * 0.7;

  // Editors list
  const editors = await User.find({ role: "editor" })
    .select("_id username email role")
    .lean();

  const editorIds = editors.map((e) => e._id);

  const [chapCounts, manhuaCounts, manhuas] = await Promise.all([
    Chapter.aggregate([
      { $match: { uploadedBy: { $in: editorIds }, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
    ]),
    Manhua.aggregate([
      { $match: { createdBy: { $in: editorIds }, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    ]),
    Manhua.find({ createdBy: { $in: editorIds } })
      .select("_id title slug createdBy views dailyViews")
      .lean(),
  ]);

  const chaptersByEditor = new Map(chapCounts.map((x) => [String(x._id), x.count]));
  const manhuasByEditor = new Map(manhuaCounts.map((x) => [String(x._id), x.count]));

  // Group manhuas by editor + compute monthly views from dailyViews
  const manhuasGrouped = new Map(); // editorId -> array
  const monthlyViewsByEditor = new Map(); // editorId -> sum
  for (const m of manhuas) {
    const editorId = String(m.createdBy);
    const dailyViewsObj = normalizeToObjectMaybeMap(m.dailyViews);
    const monthlyViews = sumMonthlyViewsFromDailyViews(dailyViewsObj, monthKey);
    const item = {
      _id: m._id,
      title: m.title,
      slug: m.slug,
      monthlyViews,
      lifetimeViews: Number(m.views || 0),
    };
    if (!manhuasGrouped.has(editorId)) manhuasGrouped.set(editorId, []);
    manhuasGrouped.get(editorId).push(item);
    monthlyViewsByEditor.set(editorId, (monthlyViewsByEditor.get(editorId) || 0) + monthlyViews);
  }

  const totals = {
    chaptersUploaded: 0,
    manhuasUploaded: 0,
    manhuaMonthlyViews: 0,
  };
  for (const e of editors) {
    const id = String(e._id);
    totals.chaptersUploaded += chaptersByEditor.get(id) || 0;
    totals.manhuasUploaded += manhuasByEditor.get(id) || 0;
    totals.manhuaMonthlyViews += monthlyViewsByEditor.get(id) || 0;
  }

  // Score = average of 3 normalized metrics (chapters, manhuas, views)
  const rows = editors.map((e) => {
    const id = String(e._id);
    const chaptersUploaded = chaptersByEditor.get(id) || 0;
    const manhuasUploaded = manhuasByEditor.get(id) || 0;
    const manhuaMonthlyViews = monthlyViewsByEditor.get(id) || 0;

    const rCh = totals.chaptersUploaded ? chaptersUploaded / totals.chaptersUploaded : 0;
    const rMh = totals.manhuasUploaded ? manhuasUploaded / totals.manhuasUploaded : 0;
    const rVw = totals.manhuaMonthlyViews ? manhuaMonthlyViews / totals.manhuaMonthlyViews : 0;
    const score = (rCh + rMh + rVw) / 3;

    const manhuaList = (manhuasGrouped.get(id) || []).sort(
      (a, b) => b.monthlyViews - a.monthlyViews
    );

    return {
      editor: { _id: e._id, username: e.username, email: e.email },
      chaptersUploaded,
      manhuasUploaded,
      manhuaMonthlyViews,
      manhuas: manhuaList,
      score,
      payout: 0,
    };
  });

  const sumScore = rows.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
  for (const r of rows) {
    r.payout = sumScore ? (editorsPool * r.score) / sumScore : 0;
  }

  // Stable sort: payout desc, then username
  rows.sort((a, b) => {
    if (b.payout !== a.payout) return b.payout - a.payout;
    return String(a.editor.username || "").localeCompare(String(b.editor.username || ""));
  });

  return res.json({
    monthKey,
    currency,
    totalRevenue,
    siteShare,
    editorsPool,
    totals,
    editors: rows,
  });
};

