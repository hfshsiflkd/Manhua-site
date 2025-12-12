// src/controllers/chapter.admin.controller.js
const Chapter = require("../../models/Chapter");
const { findManhuaBySlugOrId } = require("../../services/manhua.service");
const { chapterCache } = require("../../cache/chapterCache");

exports.createChapter = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { chapterNumber, title, pages, language, status } = req.body;

    const manhua = await findManhuaBySlugOrId(slug);
    if (!manhua) return res.status(404).json({ message: "Манхуа олдсонгүй" });

    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ message: "Pages массив хоосон байна" });
    }

    const formattedPages = pages.map((p, idx) => ({
      pageNumber: p.pageNumber ?? idx + 1,
      imageUrl: p.imageUrl,
    }));

    const chapter = await Chapter.create({
      manhua: manhua._id,
      chapterNumber,
      title,
      pages: formattedPages,
      language: language || "mn",
      status: status || "published",
      views: 0,
    });

    // ✅ cache invalidate (энэ manhua-д хамаарах chapter cache-ууд)
    chapterCache.delByPrefix(String(manhua._id));

    res.status(201).json(chapter);
  } catch (err) {
    next(err);
  }
};
