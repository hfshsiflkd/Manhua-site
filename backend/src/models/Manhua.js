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
    description: {
      type: String,
    },
    // Чиний өмнө нь ашигладаг талбар аль нь байхаас хамаарч ашиглана
    coverImage: {
      type: String, // үндсэн cover URL
    },
    coverImageUrl: {
      type: String, // хүсвэл CDN / бусад URL
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

    // ✨ ЯГ ЭНЭ: манхуа үүсгэсэн хэрэглэгч
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vieaws : {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

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
