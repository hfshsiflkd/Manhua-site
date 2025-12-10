// src/models/Manhua.js
const mongoose = require("mongoose");

const manhuaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
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

// 🔗 Virtual: энэ манхуад харьяалагдсан бүх chapter
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

// ⛓ Manhua-гаа find хийх болгонд chapters-ийг автоматаар дагуулж populate хийх
function autoPopulateChapters(next) {
  this.populate({
    path: "chapters",
    options: { sort: { chapterNumber: 1 } },
    select: "chapterNumber title language status views createdAt updatedAt",
  });
  next();
}

manhuaSchema.pre("find", autoPopulateChapters);
manhuaSchema.pre("findOne", autoPopulateChapters);

module.exports = mongoose.model("Manhua", manhuaSchema);
