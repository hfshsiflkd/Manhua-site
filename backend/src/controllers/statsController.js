const Manhua = require("../models/Manhua");

// GET /api/stats/trending?limit=10
exports.getTrending = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const manhuas = await Manhua.find()
      .sort({ views: -1 })
      .limit(limit)
      .lean();

    res.json(manhuas);
  } catch (err) {
    next(err);
  }
};

// GET /api/stats/health
exports.healthCheck = (req, res) => {
  const { deployCommit, deployId } = require("../config/writeGate");
  res.json({
    status: "ok",
    commit: deployCommit(),
    deploymentId: deployId(),
  });
};
