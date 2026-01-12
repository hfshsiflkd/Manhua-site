const mongoose = require("mongoose");

/**
 * ChapterReadMonth
 * - Deduplicate views per (chapterId, viewerKey, monthKey)
 * - Used for editor monthly salary/leaderboard view counting
 * - Old records are auto-cleaned by TTL index on expireAt
 */
const chapterReadMonthSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
      index: true,
    },

    // viewerKey is "user:<userId>" OR "device:<sha256(deviceId)>"
    viewerKey: { type: String, required: true, index: true },

    // YYYY-MM (UTC)
    monthKey: { type: String, required: true, index: true },

    firstReadAt: { type: Date, default: Date.now },

    // TTL cleanup: MongoDB will delete documents after expireAt
    expireAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// One viewer counts once per chapter per month
chapterReadMonthSchema.index(
  { chapterId: 1, viewerKey: 1, monthKey: 1 },
  { unique: true }
);

// Auto-delete after expireAt (0 seconds after the time)
chapterReadMonthSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ChapterReadMonth", chapterReadMonthSchema);

