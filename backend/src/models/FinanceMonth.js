const mongoose = require("mongoose");

const financeRevenueEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // payer / target user
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who recorded it
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "MNT" },
    paidAt: { type: Date, required: true },
    monthsGranted: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const financeMonthSchema = new mongoose.Schema(
  {
    // YYYY-MM (e.g. 2026-01)
    monthKey: { type: String, required: true, unique: true, index: true },
    totalRevenue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "MNT" },
    revenueEvents: { type: [financeRevenueEventSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinanceMonth", financeMonthSchema);

