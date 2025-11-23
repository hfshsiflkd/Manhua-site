const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    isVIP: { type: Boolean, default: false },
    vipExpiresAt: { type: Date, default: null },

    // 🔥 НЭГ АККАУНТААР НЭГ ХҮН ОРОХ — ШИНЭ ТАЛБАР
    sessionToken: { type: String, default: null },
  },
  { timestamps: true }
);

// bcrypt hash
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", userSchema);
