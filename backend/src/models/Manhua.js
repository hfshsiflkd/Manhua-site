// src/models/Manhua.js
const mongoose = require("mongoose");

const manhuaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleEn: {
      type: String,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    description: {
      type: String,
    },

    coverImage: {
      type: String,
    },

    coverImageUrl: {
      type: String,
    },

    // 📊 Rating талбарууд
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ongoing", "completed", "hiatus"],
      default: "ongoing",
    },

    genres: [
      {
        type: String,
        trim: true,
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    views: {
      type: Number,
      default: 0,
    },

    // Daily views tracking: { "2024-12-16": 150, "2024-12-17": 200, ... }
    dailyViews: {
      type: Map,
      of: Number,
      default: {},
    },

    // Weekly views for fallback
    weeklyViews: {
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

// 🔗 Virtual: энэ манхуад харьяалагдсан бүх chapter
manhuaSchema.virtual("chapters", {
  ref: "Chapter",
  localField: "_id",
  foreignField: "manhua",
});

// ─── Indexes ────────────────────────────────────────────────────────────────
// Home hero: sort by rating desc
manhuaSchema.index({ rating: -1 });
// Home latest: sort by updatedAt desc
manhuaSchema.index({ updatedAt: -1 });
// Popular fallback sorts
manhuaSchema.index({ weeklyViews: -1 });
manhuaSchema.index({ views: -1 });

// slug автоматаар үүсгэх
manhuaSchema.pre("save", function (next) {
  if (!this.slug && (this.titleEn || this.title)) {
    const slugSource = this.titleEn || this.title;
    this.slug = slugSource
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});


module.exports = mongoose.model("Manhua", manhuaSchema);
