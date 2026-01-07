const jwt = require("jsonwebtoken");
const Chapter = require("../models/Chapter");
const Manhua = require("../models/Manhua");
const ChapterRead = require("../models/ChapterRead");
const hashToken = require("../utils/hashToken");

const MIN_READ_SECONDS = 8;
const START_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getViewerKey(req) {
  const userId = req.user?._id || req.user?.id;
  if (userId) return `user:${String(userId)}`;

  const deviceId = String(req.headers["x-device-id"] || "").trim();
  if (!deviceId) return null;
  return `device:${hashToken(deviceId)}`;
}

// POST /api/chapters/:id/read/start
// Returns a signed token that must be confirmed after >= 8 seconds.
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

    const issuedAtSec = Number(decoded?.iat || 0);
    const ageSec = Math.floor(Date.now() / 1000) - issuedAtSec;
    if (!Number.isFinite(ageSec) || ageSec < MIN_READ_SECONDS) {
      return res.status(409).json({
        message: `Must read at least ${MIN_READ_SECONDS} seconds`,
        code: "READ_TOO_SHORT",
        requiredSeconds: MIN_READ_SECONDS,
        elapsedSeconds: Math.max(0, ageSec),
      });
    }

    // Ensure chapter exists (and use its manhua id)
    const chapter = await Chapter.findById(chapterId).select("_id manhua").lean();
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    // Deduplicate: count only first-ever read for this viewerKey.
    try {
      await ChapterRead.create({
        chapterId: chapter._id,
        viewerKey,
        firstReadAt: new Date(),
      });
    } catch (err) {
      // Duplicate key => already counted before
      if (err && err.code === 11000) {
        return res.json({ counted: false, reason: "already_read" });
      }
      throw err;
    }

    // Count view into lifetime + daily + monthly
    const todayKey = getTodayDateKey();
    const monthKey = getMonthKey();

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

