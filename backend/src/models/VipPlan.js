// src/models/VipPlan.js
const mongoose = require("mongoose");

const vipPlanSchema = new mongoose.Schema(
  {
    months: {
      type: Number,
      required: true,
      min: 1,
      max: 24,
    },
    priceTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for active plans
vipPlanSchema.index({ active: 1, displayOrder: 1 });

const { bindModel } = require("../store/driver");

module.exports = bindModel(mongoose.model("VipPlan", vipPlanSchema), () =>
  require("../store/pg/stats").VipPlan
);

