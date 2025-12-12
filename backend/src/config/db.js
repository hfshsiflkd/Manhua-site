const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, 
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected");

    // ⚠️ Index-үүдийг 1 УДАА sync хийнэ
    if (process.env.NODE_ENV !== "production") {
      const Chapter = require("../models/Chapter");
      await Chapter.syncIndexes();
      console.log("📌 Chapter indexes synced");
    }
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
}

module.exports = connectDB;
