const sendEmail = require("../utils/sendEmail");

async function enqueueEmail(payload) {
  // Одоохондоо шууд илгээнэ
  // Дараа нь Bull / Bee / worker салгаж болно
  return sendEmail(payload);
}

module.exports = { enqueueEmail };
