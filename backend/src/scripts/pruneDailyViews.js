/**
 * dailyViews болон monthlyViews хуучин өгөгдлийг цэвэрлэх script.
 * Хэрэглээ: node src/scripts/pruneDailyViews.js [--days=90] [--dry-run]
 *
 * Cron жишээ (сар бүрийн 1-нд): 0 2 1 * * node src/scripts/pruneDailyViews.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Chapter = require("../models/Chapter");
const Manhua = require("../models/Manhua");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const daysArg = args.find((a) => a.startsWith("--days="));
const KEEP_DAYS = daysArg ? parseInt(daysArg.split("=")[1], 10) : 90;
const KEEP_MONTHS = 13; // monthlyViews: 13 сар хадгална

function getCutoffDateKey(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCutoffMonthKey(monthsAgo) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function pruneModel(Model, name) {
  const cutoffDay = getCutoffDateKey(KEEP_DAYS);
  const cutoffMonth = getCutoffMonthKey(KEEP_MONTHS);

  const docs = await Model.find(
    {
      $or: [
        { "dailyViews.0": { $exists: true } },
        { "monthlyViews.0": { $exists: true } },
      ],
    },
    { dailyViews: 1, monthlyViews: 1 }
  ).lean();

  let updated = 0;

  for (const doc of docs) {
    const unsetFields = {};

    if (doc.dailyViews) {
      for (const key of Object.keys(doc.dailyViews)) {
        if (key < cutoffDay) unsetFields[`dailyViews.${key}`] = "";
      }
    }
    if (doc.monthlyViews) {
      for (const key of Object.keys(doc.monthlyViews)) {
        if (key < cutoffMonth) unsetFields[`monthlyViews.${key}`] = "";
      }
    }

    if (Object.keys(unsetFields).length === 0) continue;

    if (!dryRun) {
      await Model.updateOne({ _id: doc._id }, { $unset: unsetFields });
    }
    updated++;
  }

  console.log(
    `[${name}] ${dryRun ? "(dry-run) " : ""}${updated} document-с хуучин view key цэвэрлэв`
  );
}

async function main() {
  console.log(
    `dailyViews цэвэрлэлт эхэлж байна (${KEEP_DAYS} хоногоос хуучин өгөгдлийг устгана)${dryRun ? " — DRY RUN" : ""}`
  );
  await mongoose.connect(process.env.MONGO_URI);

  await pruneModel(Chapter, "Chapter");
  await pruneModel(Manhua, "Manhua");

  await mongoose.disconnect();
  console.log("Дууслаа.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
