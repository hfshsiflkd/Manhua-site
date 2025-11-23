const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

commentSchema.index({ chapter: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
