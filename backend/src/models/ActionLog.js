// backend/src/models/ActionLog.js
const mongoose = require("mongoose");

const actionLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true, // ж: "CREATE_MANHUA", "UPDATE_USER_ROLE"
    },
    targetType: {
      type: String, // ж: "manhua", "user", "chapter"
      required: true,
    },
    targetId: {
      type: String, // ObjectId-аа string болгож хадгалж болно
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ActionLog", actionLogSchema);
