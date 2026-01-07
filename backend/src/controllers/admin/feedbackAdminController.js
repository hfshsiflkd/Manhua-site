const Feedback = require("../../models/Feedback");

// GET /api/admin/feedback?page=1&limit=20&type=...&status=...
exports.listFeedback = async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.type && ["suggestion_request", "complaint"].includes(String(req.query.type))) {
    filter.type = String(req.query.type);
  }
  if (req.query.status && ["new", "reviewed", "resolved"].includes(String(req.query.status))) {
    filter.status = String(req.query.status);
  }

  const [items, total] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Feedback.countDocuments(filter),
  ]);

  return res.json({
    items: items.map((f) => ({
      _id: f._id,
      type: f.type,
      status: f.status,
      name: f.name,
      description: f.description,
      imageUrl: f.imageUrl,
      createdAt: f.createdAt,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/admin/feedback/:id
exports.getFeedbackById = async (req, res) => {
  const doc = await Feedback.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json(doc);
};

// PATCH /api/admin/feedback/:id  body: { status }
exports.updateFeedbackStatus = async (req, res) => {
  const status = String(req.body?.status || "").trim();
  if (!["new", "reviewed", "resolved"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const doc = await Feedback.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json(doc);
};

