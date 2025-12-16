// src/controllers/settingsController.js
const AppSetting = require("../models/AppSetting");

// Default VIP settings
const DEFAULT_VIP_SETTINGS = {
  plans: [
    {
      key: "1M",
      title: "ACCESS 1",
      priceMnt: 6000,
      durationDays: 30,
      badgeLabel: null,
      isHighlighted: false,
      features: [
        "Бүх манхуа, бүх chapter (full unlock)",
        "1 аккаунт = 1 төхөөрөмж",
      ],
    },
    {
      key: "3M",
      title: "ACCESS 2",
      priceMnt: 15000,
      durationDays: 90,
      badgeLabel: "Supporter",
      isHighlighted: true,
      features: [
        "Бүх манхуа, бүх chapter (full unlock)",
        "1 аккаунт = 1 төхөөрөмж",
      ],
    },
    {
      key: "6M",
      title: "ACCESS 3",
      priceMnt: 28000,
      durationDays: 180,
      badgeLabel: "Founder",
      isHighlighted: false,
      features: [
        "Бүх манхуа, бүх chapter (full unlock)",
        "1 аккаунт = 1 төхөөрөмж",
      ],
    },
  ],
  payment: {
    bankName: "Банкны нэр",
    accountName: "Дансны нэр",
    accountNumber: "XXXX-XXXX-XXXX",
    note: "Хуулга/гүйлгээ хийсний дараа админ баталгаажуулна.",
  },
};

// Helper to get or create VIP settings
async function getOrCreateVipSettings() {
  let setting = await AppSetting.findOne({ key: "vip" });
  if (!setting) {
    setting = await AppSetting.create({
      key: "vip",
      value: DEFAULT_VIP_SETTINGS,
    });
  }
  return setting.value;
}

// Export helper for use in admin controller
exports.getOrCreateVipSettings = getOrCreateVipSettings;

// GET /api/settings/vip - Public endpoint
exports.getVipSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateVipSettings();
    res.json({
      success: true,
      plans: settings.plans || [],
      payment: settings.payment || {},
    });
  } catch (err) {
    next(err);
  }
};

