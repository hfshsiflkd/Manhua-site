const ActionLog = require("../models/ActionLog");

async function logAction({
  userId,
  action,
  targetType,
  targetId,
  description,
  meta,
}) {
  try {
    await ActionLog.create({
      user: userId,
      action,
      targetType,
      targetId,
      description,
      meta,
    });
  } catch (err) {
    console.error("Log бичихэд алдаа:", err.message);
  }
}

module.exports = logAction;
