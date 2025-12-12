const Chapter = require("../models/Chapter");
const Manhua = require("../models/Manhua");

const chapterCounts = new Map(); // chapterId -> count
const manhuaCounts = new Map(); // manhuaId -> count

function inc(map, id) {
  const key = String(id);
  map.set(key, (map.get(key) || 0) + 1);
}

function trackView({ chapterId, manhuaId }) {
  if (chapterId) inc(chapterCounts, chapterId);
  if (manhuaId) inc(manhuaCounts, manhuaId);
}

async function flush() {
  if (chapterCounts.size) {
    const ops = [];
    for (const [id, n] of chapterCounts.entries()) {
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $inc: { views: n } },
        },
      });
    }
    chapterCounts.clear();
    Chapter.bulkWrite(ops, { ordered: false }).catch(() => {});
  }

  if (manhuaCounts.size) {
    const ops = [];
    for (const [id, n] of manhuaCounts.entries()) {
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $inc: { views: n } },
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
