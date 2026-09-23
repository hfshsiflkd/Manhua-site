// src/scripts/seedVipPlans.js
// Run this script to seed default VIP plans
// Usage: node src/scripts/seedVipPlans.js

require("dotenv").config();
const VipPlan = require("../models/VipPlan");
const { connectAppDb, disconnectAppDb } = require("./connectAppDb");
const { assertWritesAllowed } = require("../config/writeGate");

const defaultPlans = [
  { months: 1, priceTotal: 5000, displayOrder: 1 },
  { months: 3, priceTotal: 13500, displayOrder: 2 }, // 4,500/month, -10%
  { months: 6, priceTotal: 24000, displayOrder: 3 }, // 4,000/month, -20%
  { months: 12, priceTotal: 42000, displayOrder: 4 }, // 3,500/month, -30%
];

async function seedPlans() {
  try {
    assertWritesAllowed("seedVipPlans");
    await connectAppDb();

    for (const planData of defaultPlans) {
      const existing = await VipPlan.findOne({ months: planData.months });
      if (existing) {
        console.log(`Plan for ${planData.months} month(s) already exists, updating...`);
        existing.priceTotal = planData.priceTotal;
        existing.displayOrder = planData.displayOrder;
        existing.active = true;
        await existing.save();
      } else {
        await VipPlan.create(planData);
        console.log(`Created plan: ${planData.months} month(s) - ${planData.priceTotal}₮`);
      }
    }

    console.log("VIP plans seeded successfully!");
    await disconnectAppDb();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding VIP plans:", error);
    process.exit(1);
  }
}

seedPlans();
