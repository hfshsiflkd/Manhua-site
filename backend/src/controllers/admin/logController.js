// src/controllers/admin/logController.js
const ActionLog = require("../../models/ActionLog");

exports.listLogs = async (req, res) => {
  try {
    const { userId, action, targetType, limit } = req.query;

    const query = {};
    if (userId) query.user = userId;
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const logs = await ActionLog.find(query)
      .populate("user", "username email role")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200));

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};
