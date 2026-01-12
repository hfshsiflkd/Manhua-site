const jwt = require("jsonwebtoken");
const Chapter = require("../models/Chapter");
const Manhua = require("../models/Manhua");
const ChapterReadMonth = require("../models/ChapterReadMonth");
const hashToken = require("../utils/hashToken");

// Set to 0 to disable "must read N seconds" gating
const MIN_READ_SECONDS = 0;
const START_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes

function getTodayDateKeyUtc() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKeyUtc() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getExpireAt(daysToKeep = 180) {
  const ms = Number(daysToKeep) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

function getViewerKey(req) {
  const userId = req.user?._id || req.user?.id;
  if (userId) return `user:${String(userId)}`;

  const deviceId = String(req.headers["x-device-id"] || "").trim();
  if (!deviceId) return null;
  return `device:${hashToken(deviceId)}`;
}

// POST /api/chapters/:id/read/start
// Returns a signed token. (No minimum read time enforced.)
exports.startRead = async (req, res) => {
  const viewerKey = getViewerKey(req);
  if (!viewerKey) {
    return res.status(400).json({
      message: "x-device-id is required for anonymous reads",
      code: "MISSING_DEVICE_ID",
    });
  }

  const chapterId = String(req.params.id || "");
  if (!/^[0-9a-fA-F]{24}$/.test(chapterId)) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  const token = jwt.sign(
    { chapterId, viewerKey, type: "chapter_read_start" },
    process.env.JWT_SECRET,
    { expiresIn: START_TOKEN_TTL_SECONDS }
  );

  return res.json({ token, minSeconds: MIN_READ_SECONDS });
};

// POST /api/chapters/:id/read/confirm
// body: { token: string }
exports.confirmRead = async (req, res, next) => {
  try {
    const chapterId = String(req.params.id || "");
    if (!/^[0-9a-fA-F]{24}$/.test(chapterId)) {
      return res.status(400).json({ message: "Invalid chapter id" });
    }

    const viewerKey = getViewerKey(req);
    if (!viewerKey) {
      return res.status(400).json({
        message: "x-device-id is required for anonymous reads",
        code: "MISSING_DEVICE_ID",
      });
    }

    const token = String(req.body?.token || "");
    if (!token) return res.status(400).json({ message: "token is required" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (decoded?.type !== "chapter_read_start") {
      return res.status(400).json({ message: "Invalid token type" });
    }
    if (decoded?.chapterId !== chapterId) {
      return res.status(400).json({ message: "Token chapterId mismatch" });
    }
    if (decoded?.viewerKey !== viewerKey) {
      return res.status(400).json({ message: "Token viewer mismatch" });
    }

    // No minimum read duration check (previously required >= MIN_READ_SECONDS)

    // Ensure chapter exists (and use its manhua id)
    const chapter = await Chapter.findById(chapterId).select("_id manhua").lean();
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    // Count views for editor salary/leaderboard:
    // Deduplicate per (chapterId, viewerKey, monthKey) so the same person can count again next month.
    const todayKey = getTodayDateKeyUtc();
    const monthKey = getMonthKeyUtc();

    try {
      await ChapterReadMonth.create({
        chapterId: chapter._id,
        viewerKey,
        monthKey,
        firstReadAt: new Date(),
        expireAt: getExpireAt(180),
      });
    } catch (err) {
      // Duplicate key => already counted before
      if (err && err.code === 11000) {
        return res.json({ counted: false, reason: "already_read_this_month" });
      }
      throw err;
    }

    // Count view into lifetime + daily + monthly
    await Chapter.updateOne(
      { _id: chapter._id },
      {
        $inc: {
          views: 1,
          [`dailyViews.${todayKey}`]: 1,
          [`monthlyViews.${monthKey}`]: 1,
        },
      }
    );

    // Keep manhua totals in sync (optional but useful for overall stats)
    if (chapter.manhua) {
      await Manhua.updateOne(
        { _id: chapter.manhua },
        {
          $inc: {
            views: 1,
            [`dailyViews.${todayKey}`]: 1,
            weeklyViews: 1,
          },
        }
      );
    }

    return res.json({ counted: true });
  } catch (err) {
    return next(err);
  }
};

