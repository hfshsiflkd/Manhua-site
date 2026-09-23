/**
 * weeklyViews-г 7 хоног тутам тэглэх script.
 * Хэрэглээ: node src/scripts/resetWeeklyViews.js [--dry-run]
 *
 * Cron жишээ (Даваа гарагийн 00:05): 5 0 * * 1 node src/scripts/resetWeeklyViews.js
 */
require("dotenv").config();
const Manhua = require("../models/Manhua");
const { connectAppDb, disconnectAppDb } = require("./connectAppDb");
const { assertWritesAllowed } = require("../config/writeGate");

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`weeklyViews reset эхэлж байна${dryRun ? " — DRY RUN" : ""}`);
  if (!dryRun) assertWritesAllowed("resetWeeklyViews");
  await connectAppDb();

  if (!dryRun) {
    const result = await Manhua.updateMany(
      { weeklyViews: { $gt: 0 } },
      { $set: { weeklyViews: 0 } }
    );
    console.log(`${result.modifiedCount} манхуаны weeklyViews тэглэгдлээ`);
  } else {
    const count = await Manhua.countDocuments({ weeklyViews: { $gt: 0 } });
    console.log(`(dry-run) ${count} манхуа тэглэгдэх байсан`);
  }

  await disconnectAppDb();
  console.log("Дууслаа.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
