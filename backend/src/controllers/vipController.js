// src/controllers/vipController.js
const VipPlan = require("../models/VipPlan");
const User = require("../models/User");
const FinanceMonth = require("../models/FinanceMonth");
const { computeIsVIP } = require("../utils/vip");
const mongoose = require("mongoose");

// setMonth()-ийн month-end overflow-г засна (e.g. Jan31 +1m → Feb28 биш Mar2 болдог)
function addMonthsSafe(date, months) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // Overflow илэрвэл (e.g. Feb31 → Mar2/3) өмнөх сарын сүүлийн өдрөөр тохируулна
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}

// GET /api/vip/plans - Get active VIP plans
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await VipPlan.find({ active: true })
      .sort({ displayOrder: 1, months: 1 })
      .lean();

    // Calculate per-month price and discount for each plan
    const plansWithDiscount = plans.map((plan) => {
      const pricePerMonth = plan.priceTotal / plan.months;
      const basePrice = 5000; // Base price for 1 month
      const discount =
        plan.months > 1
          ? Math.round(((basePrice - pricePerMonth) / basePrice) * 100)
          : 0;

      return {
        id: plan._id.toString(),
        months: plan.months,
        priceTotal: plan.priceTotal,
        pricePerMonth: Math.round(pricePerMonth),
        discount: discount > 0 ? discount : null,
        active: plan.active,
      };
    });

    res.json({ plans: plansWithDiscount });
  } catch (err) {
    next(err);
  }
};

// POST /api/vip/purchase - Purchase/extend VIP
exports.purchaseVip = async (req, res, next) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: "VIP төлөвлөгөө сонгоно уу." });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(planId)) {
      return res.status(400).json({ success: false, message: "VIP төлөвлөгөө ID буруу байна." });
    }

    const plan = await VipPlan.findById(planId);
    if (!plan || !plan.active) {
      return res.status(404).json({
        success: false,
        message: "VIP төлөвлөгөө олдсонгүй.",
      });
    }

    // Get user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Хэрэглэгч олдсонгүй.",
      });
    }

    const now = new Date();

    // Atomic update: race condition-г зайлсхийхийн тулд findOneAndUpdate ашиглана.
    // Хэрэглэгч VIP идэвхтэй бол vipExpiresAt-с, эс тэгвэл одоогоос сунгана.
    const base = user.vipExpiresAt && new Date(user.vipExpiresAt) > now
      ? new Date(user.vipExpiresAt)
      : now;
    const newVipExpiresAt = addMonthsSafe(base, plan.months);

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { vipExpiresAt: newVipExpiresAt, isVIP: true } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Хэрэглэгч олдсонгүй." });
    }

    // Finance record
    const paidAt = now;
    const monthKey = `${paidAt.getUTCFullYear()}-${String(paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
    await FinanceMonth.findOneAndUpdate(
      { monthKey },
      {
        $inc: { totalRevenue: plan.priceTotal },
        $push: {
          revenueEvents: {
            userId: user._id,
            adminId: req.user._id,
            amount: plan.priceTotal,
            currency: "MNT",
            paidAt,
            monthsGranted: plan.months,
            note: "vip_purchase",
          },
        },
        $setOnInsert: { currency: "MNT" },
      },
      { upsert: true, new: false }
    );

    res.json({
      success: true,
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isVIP: updatedUser.isVIP,
        vipExpiresAt: updatedUser.vipExpiresAt,
        avatar: updatedUser.avatar,
      },
      message: "VIP амжилттай идэвхжлээ.",
    });
  } catch (err) {
    console.error("VIP purchase error:", err);
    next(err);
  }
};

