const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["suggestion_request", "complaint"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    imageUrl: { type: String, default: "" },

    status: {
      type: String,
      enum: ["new", "reviewed", "resolved"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);

