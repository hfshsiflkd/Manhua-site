// src/models/Manhua.js
const mongoose = require("mongoose");

const manhuaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String },
    coverImage: { type: String },
    coverImageUrl: { type: String },
    status: {
      type: String,
      enum: ["ongoing", "completed", "hiatus"],
      default: "ongoing",
    },
    genres: [{ type: String, trim: true }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ❗ typo-гоо засчихвал зүгээр: views
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔗 virtual холбоос: энэ манхуад харьяалагдсан бүх chapter
manhuaSchema.virtual("chapters", {
  ref: "Chapter",
  localField: "_id",
  foreignField: "manhua",
});

// slug автоматаар үүсгэх
manhuaSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

module.exports = mongoose.model("Manhua", manhuaSchema);
