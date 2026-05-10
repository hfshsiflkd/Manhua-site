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

    // 🗑️ Soft delete
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 🗑️ Soft delete: бүх find query-нд устгасныг хасна
chapterSchema.pre(/^find/, function (next) {
  if (this.getOptions && this.getOptions().withDeleted) return next();
  const query = this.getQuery();
  if (query.deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

/* =========================
   🔹 INDEX-ҮҮД (ЧУХАЛ)
========================= */

// ✅ 1. Давхцахгүй байх — partial: зөвхөн идэвхтэй (устгаагүй) chapter-уудад л үйлчилнэ.
//    Тэгснээр soft-deleted chapter байхад л шинэ ижил дугаартай үүсгэхэд саад болохгүй.
chapterSchema.index(
  { manhua: 1, chapterNumber: 1, language: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
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

// Home latestUpdates: Chapter.find({ status: "published" }).sort({ createdAt: -1 })
chapterSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Chapter", chapterSchema);
