const mongoose = require("mongoose");

const chapterReadSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
      index: true,
    },

    // viewerKey is "user:<userId>" OR "device:<sha256(deviceId)>"
    viewerKey: { type: String, required: true, index: true },

    firstReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chapterReadSchema.index({ chapterId: 1, viewerKey: 1 }, { unique: true });

module.exports = mongoose.model("ChapterRead", chapterReadSchema);

