const AppSetting = require("../models/AppSetting");

async function getSetting(key, defaultValue) {
  const doc = await AppSetting.findOne({ key });
  return doc ? doc.value : defaultValue;
}

async function setSetting(key, value) {
  return AppSetting.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
}

module.exports = { getSetting, setSetting };
