// src/controllers/vipController.js
const VipPlan = require("../models/VipPlan");
const User = require("../models/User");
const FinanceMonth = require("../models/FinanceMonth");
const { computeIsVIP } = require("../utils/vip");

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
      return res.status(400).json({
        success: false,
        message: "VIP төлөвлөгөө сонгоно уу.",
      });
    }

    // Get plan
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

    // Calculate new VIP expiration
    const now = new Date();
    let newVipExpiresAt;

    if (user.vipExpiresAt && new Date(user.vipExpiresAt) > now) {
      // User is still VIP - extend from current expiration
      newVipExpiresAt = new Date(user.vipExpiresAt);
      newVipExpiresAt.setMonth(newVipExpiresAt.getMonth() + plan.months);
    } else {
      // User is not VIP or expired - start from now
      newVipExpiresAt = new Date();
      newVipExpiresAt.setMonth(newVipExpiresAt.getMonth() + plan.months);
    }

    // Update user VIP status
    user.vipExpiresAt = newVipExpiresAt;
    user.isVIP = true; // Will be recomputed, but set explicitly
    await user.save();

    // Record revenue for user leaderboard + finance distribution
    // (treating purchase as paid immediately)
    const paidAt = new Date();
    const monthKey = `${paidAt.getUTCFullYear()}-${String(
      paidAt.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    await FinanceMonth.findOneAndUpdate(
      { monthKey },
      {
        $inc: { totalRevenue: plan.priceTotal },
        $push: {
          revenueEvents: {
            userId: user._id,
            adminId: null,
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

    // Recompute VIP status
    const isVIP = computeIsVIP(user);
    if (user.isVIP !== isVIP) {
      user.isVIP = isVIP;
      await user.save();
    }

    // Return updated user
    const updatedUser = await User.findById(user._id).select("-password");

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

