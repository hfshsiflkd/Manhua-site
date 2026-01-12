const mongoose = require("mongoose");

/**
 * EditorManhuaMonthStat
 * - Monthly view totals per editor per manhua (for breakdown)
 * - Keeps history (no TTL)
 *
 * monthKey: YYYY-MM (UTC)
 */
const editorManhuaMonthStatSchema = new mongoose.Schema(
  {
    monthKey: { type: String, required: true, index: true },
    editorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    manhuaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manhua",
      required: true,
      index: true,
    },

    monthlyViews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

editorManhuaMonthStatSchema.index(
  { monthKey: 1, editorId: 1, manhuaId: 1 },
  { unique: true }
);

module.exports = mongoose.model("EditorManhuaMonthStat", editorManhuaMonthStatSchema);

