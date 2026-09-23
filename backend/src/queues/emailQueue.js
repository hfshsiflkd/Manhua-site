const sendEmail = require("../utils/sendEmail");

async function enqueueEmail(payload) {
  const { writesFrozen } = require("../config/writeGate");
  if (writesFrozen()) return { skipped: true, reason: "READ_ONLY" };
  return sendEmail(payload);
}

module.exports = { enqueueEmail };
