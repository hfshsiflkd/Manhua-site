const mongoose = require("mongoose");

const manhuaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    coverImageUrl: String,

    status: {
      type: String,
      enum: ["ongoing", "completed", "hiatus"],
      default: "ongoing",
    },

    genres: [String],
    author: String,
    artist: String,

    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

manhuaSchema.index({ slug: 1 });

module.exports = mongoose.model("Manhua", manhuaSchema);
