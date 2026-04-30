// src/controllers/adminSettingsController.js
const AppSetting = require("../models/AppSetting");
const { getOrCreateVipSettings } = require("./settingsController");

// ─── Free Read Mode ────────────────────────────────────────────────────────

// GET /api/admin/settings/free-read
exports.getFreeReadMode = async (req, res, next) => {
  try {
    const doc = await AppSetting.findOne({ key: "freeReadMode" });
    const value = doc?.value || { enabled: false, expiresAt: null };
    res.json({ success: true, ...value });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/settings/free-read
exports.setFreeReadMode = async (req, res, next) => {
  try {
    const { enabled, expiresAt } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ success: false, message: "enabled must be boolean" });
    }

    const value = {
      enabled,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    await AppSetting.findOneAndUpdate(
      { key: "freeReadMode" },
      { value },
      { upsert: true, new: true }
    );

    const redisCache = require("../cache/redisCache");
    await redisCache.del("setting:freeReadMode");

    res.json({ success: true, ...value });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/settings/vip
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

// PUT /api/admin/settings/vip
exports.updateVipSettings = async (req, res, next) => {
  try {
    const { plans, payment } = req.body;

    // Validation
    if (!Array.isArray(plans) || plans.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Plans array must contain exactly 3 plans",
      });
    }

    if (!payment || typeof payment !== "object") {
      return res.status(400).json({
        success: false,
        message: "Payment object is required",
      });
    }

    // Validate plans
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      if (!plan.key || typeof plan.key !== "string" || !plan.key.trim()) {
        return res.status(400).json({
          success: false,
          message: `Plan ${i + 1}: key is required and must be a non-empty string`,
        });
      }
      if (!plan.title || typeof plan.title !== "string" || !plan.title.trim()) {
        return res.status(400).json({
          success: false,
          message: `Plan ${i + 1}: title is required and must be a non-empty string`,
        });
      }
      if (
        typeof plan.priceMnt !== "number" ||
        plan.priceMnt <= 0 ||
        !Number.isInteger(plan.priceMnt)
      ) {
        return res.status(400).json({
          success: false,
          message: `Plan ${i + 1}: priceMnt must be a positive integer`,
        });
      }
      if (
        typeof plan.durationDays !== "number" ||
        plan.durationDays <= 0 ||
        !Number.isInteger(plan.durationDays)
      ) {
        return res.status(400).json({
          success: false,
          message: `Plan ${i + 1}: durationDays must be a positive integer`,
        });
      }
      if (plan.badgeLabel !== null && plan.badgeLabel !== undefined) {
        if (typeof plan.badgeLabel !== "string") {
          return res.status(400).json({
            success: false,
            message: `Plan ${i + 1}: badgeLabel must be a string or null`,
          });
        }
      }
      if (typeof plan.isHighlighted !== "boolean") {
        return res.status(400).json({
          success: false,
          message: `Plan ${i + 1}: isHighlighted must be a boolean`,
        });
      }
      if (!Array.isArray(plan.features)) {
        return res.status(400).json({
          success: false,
          message: `Plan ${i + 1}: features must be an array`,
        });
      }
    }

    // Validate payment
    if (payment.bankName && typeof payment.bankName !== "string") {
      return res.status(400).json({ success: false, message: "Payment bankName must be a string" });
    }
    if (payment.accountName && typeof payment.accountName !== "string") {
      return res.status(400).json({ success: false, message: "Payment accountName must be a string" });
    }
    if (
      !payment.accountNumber ||
      typeof payment.accountNumber !== "string" ||
      !payment.accountNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment accountNumber is required and cannot be empty",
      });
    }
    if (payment.note && typeof payment.note !== "string") {
      return res.status(400).json({ success: false, message: "Payment note must be a string" });
    }
    if (payment.qpayUrl && typeof payment.qpayUrl !== "string") {
      return res.status(400).json({ success: false, message: "Payment qpayUrl must be a string" });
    }

    // Sanitize and prepare data
    const sanitizedPlans = plans.map((plan) => ({
      key: plan.key.trim(),
      title: plan.title.trim(),
      priceMnt: plan.priceMnt,
      durationDays: plan.durationDays,
      badgeLabel: plan.badgeLabel ? plan.badgeLabel.trim() : null,
      isHighlighted: plan.isHighlighted,
      features: plan.features
        .filter((f) => f && typeof f === "string")
        .map((f) => f.trim())
        .filter((f) => f.length > 0),
    }));

    const sanitizedPayment = {
      bankName: payment.bankName ? payment.bankName.trim() : "",
      accountName: payment.accountName ? payment.accountName.trim() : "",
      accountNumber: payment.accountNumber.trim(),
      note: payment.note ? payment.note.trim() : "",
      qpayUrl: payment.qpayUrl ? payment.qpayUrl.trim() : "",
    };

    // Update or create setting
    const setting = await AppSetting.findOneAndUpdate(
      { key: "vip" },
      {
        key: "vip",
        value: {
          plans: sanitizedPlans,
          payment: sanitizedPayment,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "VIP settings updated successfully",
      plans: setting.value.plans,
      payment: setting.value.payment,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: err.message,
      });
    }
    next(err);
  }
};

