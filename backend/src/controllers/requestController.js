const Request = require("../models/Request");

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isVipUser(user) {
  if (!user) return false;
  if (user.isVIP) return true;
  if (user.vipExpiresAt) {
    return new Date(user.vipExpiresAt).getTime() > Date.now();
  }
  return false;
}

exports.listRequests = async (req, res, next) => {
  try {
    const monthKey = req.query.month || getMonthKey();
    const items = await Request.find().sort({ createdAt: -1 }).lean();

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

exports.createRequest = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Нэвтэрсэн байх шаардлагатай." });
    }

    const title = String(req.body?.title || "").trim();
    const imageUrl = String(req.body?.imageUrl || "").trim();
    const deviceId = req.headers["x-device-id"] || "";

    if (!title) {
      return res.status(400).json({ message: "Манхуа нэр шаардлагатай." });
    }

    const now = new Date();
    const monthKey = getMonthKey(now);

    const monthlyVotes = {};
    const votersByMonth = {};
    let votes = 0;

    if (deviceId) {
      monthlyVotes[monthKey] = 1;
      votersByMonth[monthKey] = [String(deviceId)];
      votes = 1;
    }

    const created = await Request.create({
      title,
      imageUrl,
      createdBy: req.user?._id,
      votes,
      monthlyVotes,
      votersByMonth,
    });

    res.status(201).json({
      ...created.toObject(),
      id: String(created._id),
      votesThisMonth: created.monthlyVotes?.get(monthKey) ?? 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.voteRequest = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Нэвтэрсэн байх шаардлагатай." });
    }

    const deviceId = req.headers["x-device-id"] || "";
    if (!deviceId) {
      return res.status(400).json({ message: "Device ID байхгүй байна." });
    }

    const item = await Request.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй." });
    }

    const monthKey = getMonthKey();
    const voters = item.votersByMonth?.get(monthKey) || [];
    if (voters.includes(String(deviceId))) {
      return res.status(409).json({ message: "Та энэ сард санал өгсөн байна." });
    }

    const nextVoters = [...voters, String(deviceId)];
    const nextMonthVotes = (item.monthlyVotes?.get(monthKey) || 0) + 1;

    item.votersByMonth.set(monthKey, nextVoters);
    item.monthlyVotes.set(monthKey, nextMonthVotes);
    item.votes = (item.votes || 0) + 1;

    await item.save();

    res.json({
      ...item.toObject(),
      id: String(item._id),
      votesThisMonth: nextMonthVotes,
    });
  } catch (err) {
    next(err);
  }
};
