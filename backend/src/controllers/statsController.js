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

// GET /api/health
exports.healthCheck = (req, res) => {
  res.json({ status: "ok" });
};
