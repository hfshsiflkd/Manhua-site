// src/controllers/chapter.admin.controller.js
const Chapter = require("../../models/Chapter");
const { findManhuaBySlugOrId } = require("../../services/manhua.service");
const { formatChapterPage } = require("../../utils/chapterPage");
const { invalidateManhuaChapterReads } = require("../../services/chapterReadCache");
const { createChapterOnce } = require("../../services/chapterIdempotency");
const { invalidatePublicManhuaCache } = require("../../utils/invalidatePublicManhuaCache");

exports.createChapter = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { chapterNumber, title, pages, language, status } = req.body;

    const manhua = await findManhuaBySlugOrId(slug);
    if (!manhua) return res.status(404).json({ message: "Манхуа олдсонгүй" });

    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ message: "Pages массив хоосон байна" });
    }

    const formattedPages = pages.map((p, idx) => formatChapterPage(p, idx));

    const { chapter, replayed } = await createChapterOnce({
      userId: String(req.user?._id || "admin"),
      idempotencyKey: req.body?.idempotencyKey,
      findById: (id) => Chapter.findById(id),
      create: () =>
        Chapter.create({
          manhua: manhua._id,
          chapterNumber,
          title,
          pages: formattedPages,
          language: language || "mn",
          status: status || "published",
          views: 0,
        }),
    });

    await invalidateManhuaChapterReads(manhua._id);
    await invalidatePublicManhuaCache();

    res.status(replayed ? 200 : 201).json(chapter);
  } catch (err) {
    next(err);
  }
};
