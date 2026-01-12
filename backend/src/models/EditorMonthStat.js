const mongoose = require("mongoose");

/**
 * EditorMonthStat
 * - Pre-aggregated monthly stats for editor payouts/leaderboard
 * - Keeps history (no TTL)
 *
 * monthKey: YYYY-MM (UTC)
 */
const editorMonthStatSchema = new mongoose.Schema(
  {
    monthKey: { type: String, required: true, index: true },
    editorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Total counted chapter views for the month (used for payout share)
    chapterMonthlyViews: { type: Number, default: 0, min: 0 },

    // Optional: how many chapters the editor created in this month (can be maintained separately)
    chaptersUploaded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

editorMonthStatSchema.index({ monthKey: 1, editorId: 1 }, { unique: true });

module.exports = mongoose.model("EditorMonthStat", editorMonthStatSchema);

