const ActionLog = require("../models/ActionLog");

exports.listLogs = async (req, res) => {
  try {
    const { userId, action, targetType, limit = 50 } = req.query;

    const filter = {};
    if (userId) filter.user = userId;
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;

    const logs = await ActionLog.find(filter)
      .populate("user", "username email role")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};
