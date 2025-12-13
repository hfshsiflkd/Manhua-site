const mongoose = require("mongoose");

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppSetting", appSettingSchema);
