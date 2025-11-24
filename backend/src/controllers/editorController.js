// src/controllers/editorController.js
const Manhua = require("../models/Manhua");

/**
 * GET /api/editor/manhuas/mine
 * - Тухайн логин хийсэн editor өөрийн нэмсэн манхуагаа харна
 */
exports.getMyManhuas = async (req, res, next) => {
  try {
    const manhuas = await Manhua.find({ createdBy: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(manhuas);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/editor/manhuas
 * - Манхуа шинээр нэмэх (createdBy = одоо логин хийсэн хэрэглэгч)
 */
exports.createManhua = async (req, res, next) => {
  try {
    const { title, description, coverImage, status, genres } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const doc = await Manhua.create({
      title,
      description,
      coverImage,
      status: status || "ongoing",
      genres: Array.isArray(genres) ? genres : [],
      createdBy: req.user._id, // ✨ чухал
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/editor/manhuas/:id
 * - Өөрийнхөө манхуа дээр засвар хийх
 * - Хэрвээ admin бол бүх manhua дээр edit хийх эрхтэй
 */
exports.updateManhua = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = { _id: id, createdBy: req.user._id };

    // admin бол createdBy-аар хязгаарлахгүй
    if (req.user.role === "admin") {
      query = { _id: id };
    }

    const doc = await Manhua.findOneAndUpdate(query, req.body, {
      new: true,
    });

    if (!doc) {
      return res
        .status(404)
        .json({ message: "Manhua not found or no permission" });
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
};
