const mongoose = require("mongoose");

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const { bindModel } = require("../store/driver");

module.exports = bindModel(mongoose.model("AppSetting", appSettingSchema), () =>
  require("../store/pg/settings").AppSetting
);
