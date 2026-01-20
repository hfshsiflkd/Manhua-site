const Request = require("../../models/Request");

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

exports.listRequests = async (req, res, next) => {
  try {
    const monthKey = req.query.month || getMonthKey();
    const items = await Request.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "username email")
      .lean();

    const enriched = items.map((item) => ({
      ...item,
      id: String(item._id),
      votesThisMonth: item.monthlyVotes?.[monthKey] ?? 0,
    }));

    res.json({ monthKey, items: enriched });
  } catch (err) {
    next(err);
  }
};
