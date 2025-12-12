// src/middleware/crash.js
function registerCrashHandlers() {
  process.on("unhandledRejection", (reason) => {
    console.error("💥 Unhandled Rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("💥 Uncaught Exception:", err);
    // production дээр PM2/Process manager restart хийлгэнэ
  });
}

module.exports = { registerCrashHandlers };
