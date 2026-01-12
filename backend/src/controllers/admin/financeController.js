const User = require("../../models/User");
const Chapter = require("../../models/Chapter");
const Manhua = require("../../models/Manhua");
const FinanceMonth = require("../../models/FinanceMonth");
const EditorMonthStat = require("../../models/EditorMonthStat");
const EditorManhuaMonthStat = require("../../models/EditorManhuaMonthStat");

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

function getMonthlyViewsFromMonthlyMap(monthlyViewsObj, monthKey) {
  if (!monthlyViewsObj || typeof monthlyViewsObj !== "object") return 0;
  const n = Number(monthlyViewsObj[monthKey] || 0);
  return Number.isFinite(n) ? n : 0;
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

  const [chapCounts, manhuaCounts, statsRows, manhuaStatsRows, manhuas] = await Promise.all([
    Chapter.aggregate([
      { $match: { uploadedBy: { $in: editorIds }, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
    ]),
    Manhua.aggregate([
      { $match: { createdBy: { $in: editorIds }, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    ]),
    // Fast path: pre-aggregated editor monthly views
    EditorMonthStat.find({ monthKey, editorId: { $in: editorIds } })
      .select("editorId chapterMonthlyViews")
      .lean(),
    // Fast path: per-editor per-manhua monthly views (breakdown)
    EditorManhuaMonthStat.find({ monthKey, editorId: { $in: editorIds } })
      .select("editorId manhuaId monthlyViews")
      .lean(),
    // For display lookup
    Manhua.find({ createdBy: { $in: editorIds } }).select("_id title slug createdBy views").lean(),
  ]);

  const chaptersByEditor = new Map(chapCounts.map((x) => [String(x._id), x.count]));
  const manhuasByEditor = new Map(manhuaCounts.map((x) => [String(x._id), x.count]));

  // Chapter monthly views by editor (this drives payout)
  const chapterMonthlyViewsByEditor = new Map(); // editorId -> sum
  for (const row of statsRows) {
    const editorId = String(row.editorId || "");
    if (!editorId) continue;
    const n = Number(row.chapterMonthlyViews || 0);
    if (!Number.isFinite(n) || n <= 0) continue;
    chapterMonthlyViewsByEditor.set(editorId, n);
  }

  // Per-editor per-manhua monthly views breakdown (informational)
  const chapterViewsByEditorManhua = new Map(); // `${editorId}:${manhuaId}` -> sum
  for (const row of manhuaStatsRows) {
    const editorId = String(row.editorId || "");
    const manhuaId = String(row.manhuaId || "");
    if (!editorId || !manhuaId) continue;
    const n = Number(row.monthlyViews || 0);
    if (!Number.isFinite(n) || n <= 0) continue;
    chapterViewsByEditorManhua.set(`${editorId}:${manhuaId}`, n);
  }

  // Fallback if no stats exist yet for this month (older data / before stats deployment)
  if (!statsRows.length) {
    const chapters = await Chapter.find({ uploadedBy: { $in: editorIds } })
      .select("_id manhua uploadedBy dailyViews monthlyViews")
      .lean();

    chapterMonthlyViewsByEditor.clear();
    chapterViewsByEditorManhua.clear();

    for (const ch of chapters) {
      const editorId = String(ch.uploadedBy || "");
      if (!editorId) continue;
      const mv = normalizeToObjectMaybeMap(ch.monthlyViews);
      const dv = normalizeToObjectMaybeMap(ch.dailyViews);
      const monthly =
        getMonthlyViewsFromMonthlyMap(mv, monthKey) ||
        sumMonthlyViewsFromDailyViews(dv, monthKey);
      if (!monthly) continue;
      chapterMonthlyViewsByEditor.set(
        editorId,
        (chapterMonthlyViewsByEditor.get(editorId) || 0) + monthly
      );
      const key = `${editorId}:${String(ch.manhua)}`;
      chapterViewsByEditorManhua.set(key, (chapterViewsByEditorManhua.get(key) || 0) + monthly);
    }
  }

  // Map manhuas for display lookup
  const manhuaLookup = new Map();
  for (const m of manhuas) manhuaLookup.set(String(m._id), m);

  // Build per-editor manhua list using chapter views (monthly)
  const manhuasGrouped = new Map(); // editorId -> array
  for (const [key, monthlyViews] of chapterViewsByEditorManhua.entries()) {
    const [editorId, manhuaId] = String(key).split(":");
    const m = manhuaLookup.get(manhuaId);
    if (!m) continue;
    const item = {
      _id: m._id,
      title: m.title,
      slug: m.slug,
      // chapter-based monthly views
      monthlyViews: Number(monthlyViews || 0),
      lifetimeViews: Number(m.views || 0),
    };
    if (!manhuasGrouped.has(editorId)) manhuasGrouped.set(editorId, []);
    manhuasGrouped.get(editorId).push(item);
  }

  const totals = {
    chaptersUploaded: 0,
    manhuasUploaded: 0,
    chapterMonthlyViews: 0,
  };
  for (const e of editors) {
    const id = String(e._id);
    totals.chaptersUploaded += chaptersByEditor.get(id) || 0;
    totals.manhuasUploaded += manhuasByEditor.get(id) || 0;
    totals.chapterMonthlyViews += chapterMonthlyViewsByEditor.get(id) || 0;
  }

  // Payout is based ONLY on chapter views (monthly).
  const rows = editors.map((e) => {
    const id = String(e._id);
    const chaptersUploaded = chaptersByEditor.get(id) || 0;
    const manhuasUploaded = manhuasByEditor.get(id) || 0;
    const chapterMonthlyViews = chapterMonthlyViewsByEditor.get(id) || 0;

    const manhuaList = (manhuasGrouped.get(id) || []).sort(
      (a, b) => b.monthlyViews - a.monthlyViews
    );

    return {
      editor: { _id: e._id, username: e.username, email: e.email },
      chaptersUploaded,
      manhuasUploaded,
      chapterMonthlyViews,
      manhuas: manhuaList,
      // keep score field for UI compatibility (score == share of chapter views)
      score: 0,
      payout: 0,
    };
  });

  const totalChapterViews = rows.reduce(
    (acc, r) => acc + (Number(r.chapterMonthlyViews) || 0),
    0
  );
  for (const r of rows) {
    r.score = totalChapterViews ? r.chapterMonthlyViews / totalChapterViews : 0;
    r.payout = totalChapterViews ? editorsPool * r.score : 0;
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

