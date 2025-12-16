const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true, trim: true }, // Snapshot of username
    // Support both chapter and manhua comments
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: false,
    },
    manhua: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manhua",
      required: false,
    },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
  },
  { timestamps: true }
);

// Indexes for efficient queries
commentSchema.index({ manhua: 1, createdAt: -1 });
commentSchema.index({ chapter: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 }); // For rate limiting

// Validation: either chapter or manhua must be present
commentSchema.pre("validate", function (next) {
  if (!this.chapter && !this.manhua) {
    return next(new Error("Either chapter or manhua must be specified"));
  }
  if (this.chapter && this.manhua) {
    return next(new Error("Cannot specify both chapter and manhua"));
  }
  next();
});

module.exports = mongoose.model("Comment", commentSchema);
