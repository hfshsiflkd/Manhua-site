/**
 * Add fake views for testing admin finance + content stats.
 *
 * What it does:
 * - Increments every Chapter.views by N (default 100)
 * - Increments each Manhua.views by (chapterCount * N)
 * - Increments each Manhua.dailyViews[date] by (chapterCount * N)
 * - Increments each Manhua.weeklyViews by (chapterCount * N)
 *
 * Usage:
 *   MONGO_URI="mongodb://..." node src/scripts/mockViews.js
 *   MONGO_URI="mongodb://..." node src/scripts/mockViews.js --perChapter=100 --date=2026-01-05
 *
 * Notes:
 * - Finance page uses Manhua.dailyViews for monthly views. Pick a date within the month you want to test.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const Chapter = require("../models/Chapter");
const Manhua = require("../models/Manhua");

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function getTodayKeyUTC() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidDateKey(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function dateToMonthKey(dateKey) {
  // dateKey: YYYY-MM-DD
  return String(dateKey).slice(0, 7);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      [
        "mockViews.js",
        "",
        "Usage:",
        "  MONGO_URI=... node src/scripts/mockViews.js",
        "  MONGO_URI=... node src/scripts/mockViews.js --perChapter=100 --date=2026-01-05",
        "",
        "Options:",
        "  --perChapter=N   Increment each chapter by N (default 100)",
        "  --date=YYYY-MM-DD Set which dailyViews key to increment (default today, UTC)",
      ].join("\n")
    );
    process.exit(0);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ Missing env: MONGO_URI (or MONGODB_URI)");
    process.exit(1);
  }

  const perChapter = Number(args.perChapter ?? 100);
  if (!Number.isFinite(perChapter) || perChapter <= 0) {
    console.error("Invalid --perChapter. Must be a number > 0");
    process.exit(1);
  }

  const dateKey = String(args.date ?? getTodayKeyUTC());
  if (!isValidDateKey(dateKey)) {
    console.error("Invalid --date. Use YYYY-MM-DD");
    process.exit(1);
  }
  const monthKey = dateToMonthKey(dateKey);

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  const totalChapters = await Chapter.countDocuments({});
  console.log(`Chapters found: ${totalChapters}`);
  if (!totalChapters) {
    console.log("No chapters to update. Exiting.");
    process.exit(0);
  }

  // 1) Increment all chapters
  const chRes = await Chapter.updateMany(
    {},
    {
      $inc: {
        views: perChapter,
        [`dailyViews.${dateKey}`]: perChapter,
        [`monthlyViews.${monthKey}`]: perChapter,
      },
    }
  );
  console.log(
    `Updated chapters: matched=${chRes.matchedCount} modified=${chRes.modifiedCount}`
  );

  // 2) Compute per-manhua chapter counts
  const manhuaCounts = await Chapter.aggregate([
    { $group: { _id: "$manhua", chapterCount: { $sum: 1 } } },
  ]);

  // 3) Bulk update manhuas
  const ops = [];
  for (const row of manhuaCounts) {
    const add = Number(row.chapterCount || 0) * perChapter;
    if (!add) continue;
    ops.push({
      updateOne: {
        filter: { _id: row._id },
        update: {
          $inc: {
            views: add,
            weeklyViews: add,
            [`dailyViews.${dateKey}`]: add,
          },
        },
      },
    });
  }

  if (ops.length) {
    const mhRes = await Manhua.bulkWrite(ops, { ordered: false });
    console.log(
      `Updated manhuas: matched=${mhRes.matchedCount} modified=${mhRes.modifiedCount}`
    );
  } else {
    console.log("No manhuas updated (no chapter counts).");
  }

  console.log(
    `Done. Added +${perChapter} to each chapter; added per-manhua totals into dailyViews.${dateKey}.`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("mockViews failed:", err);
  process.exit(1);
});

