const mongoose = require("mongoose");

const trialDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, unique: true, index: true, required: true },
    firstUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    firstGrantedAt: { type: Date, default: Date.now },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrialDevice", trialDeviceSchema);
