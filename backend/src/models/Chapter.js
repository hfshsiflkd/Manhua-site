// src/models/Chapter.js
const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    originalName: { type: String, default: null },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    manhua: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manhua",
      required: true,
      index: true,
    },

    chapterNumber: {
      type: Number,
      required: true,
    },

    title: String,

    pages: [pageSchema],

    language: {
      type: String,
      default: "mn",
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    views: {
      type: Number,
      default: 0,
    },

    // Daily views tracking for monthly finance: { "2026-01-05": 10, ... }
    dailyViews: {
      type: Map,
      of: Number,
      default: {},
    },

    // Monthly views tracking: { "2026-01": 123, ... }
    monthlyViews: {
      type: Map,
      of: Number,
      default: {},
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   🔹 INDEX-ҮҮД (ЧУХАЛ)
========================= */

// ✅ 1. Давхцахгүй байх (танд байсан)
chapterSchema.index(
  { manhua: 1, chapterNumber: 1, language: 1 },
  { unique: true }
);

// ✅ 2. MAIN getChapter query (хамгийн чухал)
chapterSchema.index({
  manhua: 1,
  language: 1,
  status: 1,
  chapterNumber: 1,
});

// ✅ 3. PREV chapter ($lt + sort -1)
chapterSchema.index({
  manhua: 1,
  language: 1,
  status: 1,
  chapterNumber: -1,
});

// (сонголтоор) Latest / admin list-д
// chapterSchema.index({ manhua: 1, createdAt: -1 });

module.exports = mongoose.model("Chapter", chapterSchema);
