// src/controllers/admin/manhuaController.js
const Manhua = require("../../models/Manhua");

exports.listManhuasWithOwner = async (req, res, next) => {
  try {
    const { limit } = req.query;

    let query = Manhua.find({})
      .populate("createdBy", "username email role")
      .sort({ createdAt: -1 });

    if (limit) {
      query = query.limit(Math.min(Number(limit) || 20, 100));
    }

    const manhuas = await query;
    res.json(manhuas);
  } catch (err) {
    next(err);
  }
};

exports.getManhuaDetailAdmin = async (req, res, next) => {
  try {
    const manhua = await Manhua.findById(req.params.id).populate(
      "createdBy",
      "username email role createdAt"
    );

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

exports.updateManhuaAdmin = async (req, res, next) => {
  try {
    const manhua = await Manhua.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("createdBy", "username email role");

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

exports.deleteManhuaAdmin = async (req, res, next) => {
  try {
    const manhua = await Manhua.findById(req.params.id);
    if (!manhua) return res.status(404).json({ message: "Manhua not found" });

    await manhua.deleteOne();

    res.json({ message: "Manhua deleted" });
  } catch (err) {
    next(err);
  }
};
