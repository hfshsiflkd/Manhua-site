// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    hasUsedTrial: { type: Boolean, default: false },
    trialGrantedAt: { type: Date, default: null },

    deviceId: { type: String, default: "" },
    lastRegisterIP: { type: String, default: "" },
    lastDeviceId: { type: String, default: "" },

    deviceSwitchWindowStart: { type: Date, default: null },
    deviceSwitchCount: { type: Number, default: 0 },

    lockUntil: { type: Date, default: null },
    lockReason: { type: String, default: "" },

    role: {
      type: String,
      enum: ["user", "translator", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isVIP: { type: Boolean, default: false },

    vipExpiresAt: {
      type: Date,
      default: null,
    },

    sessionToken: { type: String, default: "" },
    resetPasswordToken: { type: String, default: null }, // hashed
    resetPasswordExpires: { type: Date, default: null },

    // 📌 Bookmark-ласан манхуанууд
    bookmarks: [
      {
        manhua: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Manhua",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ⏱ Сүүлд үзсэн манхуанууд
    recentlyViewed: [
      {
        manhua: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Manhua",
          required: true,
        },
        lastChapter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Chapter",
        },
        lastReadAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 🔒 password hash
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// 🔑 password check
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// src/models/User.js

const crypto = require("crypto");

userSchema.add({
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

// reset token үүсгэх method
userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 минут

  return rawToken; // email-д явуулах
};

// Хэрэгтэй бол bookmark / recentlyViewed дээр index тавьж болно
// userSchema.index({ "bookmarks.manhua": 1 });
// userSchema.index({ "recentlyViewed.manhua": 1 });

const User = mongoose.model("User", userSchema);
module.exports = User;
