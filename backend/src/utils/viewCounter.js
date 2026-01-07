const Chapter = require("../models/Chapter");
const Manhua = require("../models/Manhua");

const chapterCounts = new Map(); // chapterId -> count
const manhuaCounts = new Map(); // manhuaId -> count

function inc(map, id) {
  const key = String(id);
  map.set(key, (map.get(key) || 0) + 1);
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function trackView({ chapterId, manhuaId }) {
  if (chapterId) inc(chapterCounts, chapterId);
  if (manhuaId) inc(manhuaCounts, manhuaId);
}

async function flush() {
  if (chapterCounts.size) {
    const todayKey = getTodayDateKey();
    const ops = [];
    for (const [id, n] of chapterCounts.entries()) {
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: {
            $inc: {
              views: n,
              [`dailyViews.${todayKey}`]: n,
            },
          },
        },
      });
    }
    chapterCounts.clear();
    Chapter.bulkWrite(ops, { ordered: false }).catch(() => {});
  }

  if (manhuaCounts.size) {
    const todayKey = getTodayDateKey();
    const ops = [];
    for (const [id, n] of manhuaCounts.entries()) {
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: {
            $inc: {
              views: n,
              [`dailyViews.${todayKey}`]: n,
              weeklyViews: n,
            },
          },
        },
      });
    }
    manhuaCounts.clear();
    Manhua.bulkWrite(ops, { ordered: false }).catch(() => {});
  }
}

// 5 секунд тутам bulk update
setInterval(flush, 5000).unref();

module.exports = { trackView };
