/**
 * Dry-run only. Classifies chapter page URLs and prints a report.
 * It never writes to the database. Do not pass production credentials
 * unless you intend to read production data.
 */
const mongoose = require("mongoose");
const { classifyImageRef } = require("../utils/imageRef");

if (process.argv.includes("--apply")) {
  console.error("Apply is disabled. This script only reports.");
  process.exit(1);
}

async function main() {
  if (!process.env.MONGO_URI || !process.env.R2_PUBLIC_BASE_URL || !process.env.R2_BUCKET_NAME) {
    console.error("MONGO_URI, R2_PUBLIC_BASE_URL, and R2_BUCKET_NAME are required. Nothing was changed.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const Chapter = require("../models/Chapter");
  const chapters = await Chapter.find().setOptions({ withDeleted: true }).select("pages").lean();
  const counts = { store: 0, uncertain: 0, empty: 0 };
  const uncertain = [];
  for (const chapter of chapters) {
    for (const page of chapter.pages || []) {
      const found = classifyImageRef(page.imageUrl);
      if (found.action === "store") counts.store += 1;
      else {
        counts[found.reason === "empty" ? "empty" : "uncertain"] += 1;
        if (uncertain.length < 50) {
          uncertain.push({ chapterId: String(chapter._id), reason: found.reason });
        }
      }
    }
  }
  console.log(JSON.stringify({ dryRun: true, chapters: chapters.length, counts, uncertain }, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
