// src/server.js
const app = require("./app");
const connectDB = require("./config/db");
require("./config/env"); // env validate хийх бол

const PORT = process.env.PORT || 9000;

async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server start failed:", error);
    process.exit(1);
  }
}

startServer();
