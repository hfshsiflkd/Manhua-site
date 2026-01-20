const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    imageUrl: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    votes: { type: Number, default: 0 },
    monthlyVotes: {
      type: Map,
      of: Number,
      default: {},
    },
    votersByMonth: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  { timestamps: true }
);

requestSchema.index({ createdAt: -1 });
requestSchema.index({ votes: -1 });

module.exports = mongoose.model("Request", requestSchema);
