// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, default: "" },

    password: { type: String, required: true, minlength: 8, select: false },

    sessionToken: { type: String, default: null },
    tokenVersion: { type: Number, default: 0 }, // bump to force logout

    hasUsedTrial: { type: Boolean, default: false },
    trialGrantedAt: { type: Date, default: null },

    deviceId: { type: String, default: "" },
    lastRegisterIP: { type: String, default: "" },
    lastDeviceId: { type: String, default: "" },

    deviceSwitchWindowStart: { type: Date, default: null },
    deviceSwitchCount: { type: Number, default: 0 },
    deviceSwitchFirstAt: { type: Date, default: null }, // Rolling window start

    lockUntil: { type: Date, default: null },
    lockReason: { type: String, default: "" },

    role: {
      type: String,
      enum: ["user", "translator", "admin", "editor"],
      default: "user",
    },

    isActive: { type: Boolean, default: true },
    blocked: { type: Boolean, default: false },

    isVIP: { type: Boolean, default: false },
    vipExpiresAt: { type: Date, default: null },
    vipLevel: { type: Number, default: 0 },

    avatar: { type: String, default: null },

    resetPasswordTokenHash: { type: String },
    resetPasswordExpiresAt: { type: Date },
    resetPasswordRequestedAt: { type: Date },

    bookmarks: [
      {
        manhua: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Manhua",
          required: true,
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    recentlyViewed: [
      {
        manhua: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Manhua",
          required: true,
        },
        lastChapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
        lastReadAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  this.resetPasswordTokenHash = tokenHash;
  this.resetPasswordExpiresAt = new Date(Date.now() + 45 * 60 * 1000);
  this.resetPasswordRequestedAt = new Date();

  return rawToken;
};

// Virtual: isLocked (computed from lockUntil)
userSchema.virtual("isLocked").get(function () {
  if (!this.lockUntil) return false;
  return new Date(this.lockUntil).getTime() > Date.now();
});

// Ensure virtuals are included in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.model("User", userSchema);
module.exports = User;
