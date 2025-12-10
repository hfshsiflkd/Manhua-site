// src/models/Chapter.js
const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    pageNumber: {
      type: Number,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
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

    title: {
      type: String,
    },

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

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// 📌 Нэг манхуа + хэл дотор chapterNumber давхцахгүй
chapterSchema.index(
  { manhua: 1, chapterNumber: 1, language: 1 },
  { unique: true }
);

// Хүсвэл сүүлийнхийг хурдан хайхад:
// chapterSchema.index({ manhua: 1, createdAt: -1 });

module.exports = mongoose.model("Chapter", chapterSchema);
