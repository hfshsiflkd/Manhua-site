const mongoose = require("mongoose");
const { isPostgres, installPostgresGuards } = require("../store/driver");
const { getPool } = require("../db/postgres");

let cached = global.__mongoose_cache__;
if (!cached) {
  cached = global.__mongoose_cache__ = { conn: null, promise: null };
}

async function connectDB() {
  if (isPostgres()) {
    installPostgresGuards();
    if (mongoose.connection.readyState === 1) {
      throw new Error("Postgres mode started with an open Mongo connection");
    }
    if (!global.__pg_connect__) {
      global.__pg_connect__ = (async () => {
        const pool = getPool();
        if (!pool) throw new Error("DATABASE_URL missing");
        await pool.query("SELECT 1");
        console.log("✅ Postgres connected");
        return pool;
      })();
    }
    return global.__pg_connect__;
  }

  try {
    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      cached.promise = mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 5,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 5000,
      });
    }

    cached.conn = await cached.promise;

    console.log("✅ MongoDB connected");

    const { writesFrozen } = require("./writeGate");
    if (!writesFrozen()) {
      const Chapter = require("../models/Chapter");
      const Manhua = require("../models/Manhua");
      await Promise.all([Chapter.syncIndexes(), Manhua.syncIndexes()]);
      console.log("📌 Indexes synced");
    }

    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error("❌ MongoDB error:", err);
    throw err;
  }
}

module.exports = connectDB;
