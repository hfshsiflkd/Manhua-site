const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, required: true },
    imageUrl: { type: String, required: true },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    manhua: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manhua",
      required: true,
    },
    chapterNumber: { type: Number, required: true },
    title: String,

    // одоохондоо зөвхөн монгол
    language: { type: String, default: "mn" },

    pages: [pageSchema],
    views: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true }
);

chapterSchema.index(
  { manhua: 1, chapterNumber: 1, language: 1 },
  { unique: true }
);

chapterSchema.index({ manhua: 1 });

module.exports = mongoose.model("Chapter", chapterSchema);
