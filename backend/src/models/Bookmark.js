const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    manhua: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manhua",
      required: true,
    },
    chapterNumber: { type: Number, required: true },
    pageNumber: { type: Number, required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, manhua: 1 }, { unique: true });

const { bindModel } = require("../store/driver");

module.exports = bindModel(mongoose.model("Bookmark", bookmarkSchema), () =>
  require("../store/pg/social").Bookmark
);
