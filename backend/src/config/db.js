const mongoose = require("mongoose");

let cached = global.__mongoose_cache__;
if (!cached) {
  cached = global.__mongoose_cache__ = { conn: null, promise: null };
}

async function connectDB() {
  try {
    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      cached.promise = mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 5,          // serverless: олон instance × 5 = хяналттай connection тоо
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 5000,
      });
    }

    cached.conn = await cached.promise;

    console.log("✅ MongoDB connected");

    // Index sync — Chapter-т partial unique index байгаа эсэхийг хянана.
    // syncIndexes: schema-д байхгүй хуучин index-ийг устгаад шинийг үүсгэнэ.
    // Serverless cold start-д нэг удаа л ажиллах тул performance-д нөлөөгүй.
    const Chapter = require("../models/Chapter");
    const Manhua = require("../models/Manhua");
    await Promise.all([Chapter.syncIndexes(), Manhua.syncIndexes()]);
    console.log("📌 Indexes synced");

    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error("❌ MongoDB error:", err);
    throw err;
  }
}

module.exports = connectDB;
