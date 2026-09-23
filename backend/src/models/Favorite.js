const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    manhua: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manhua",
      required: true,
    },
  },
  { timestamps: true }
);

favoriteSchema.index({ user: 1, manhua: 1 }, { unique: true });
favoriteSchema.index({ user: 1 });

const { bindModel } = require("../store/driver");

module.exports = bindModel(mongoose.model("Favorite", favoriteSchema), () =>
  require("../store/pg/Favorite")
);
