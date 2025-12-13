const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    ip: { type: String, index: true },
  },
  { timestamps: true }
);

schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 }); // 24 цагийн дараа автоматаар устгана

module.exports = mongoose.model("RegisterAttempt", schema);
