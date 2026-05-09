// src/controllers/admin/trashController.js
const Manhua = require("../../models/Manhua");
const Chapter = require("../../models/Chapter");
const cache = require("../../utils/cache");

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

// GET /api/admin/trash/manhuas — устгасан манхуа жагсаалт
exports.listDeletedManhuas = async (req, res, next) => {
  try {
    const manhuas = await Manhua.find({ deletedAt: { $ne: null } })
      .setOptions({ withDeleted: true })
      .populate("createdBy", "username email")
      .populate("deletedBy", "username email")
      .sort({ deletedAt: -1 })
      .lean();

    // Chapter тоо тус манхуагаар
    const ids = manhuas.map((m) => m._id);
    const counts = await Chapter.aggregate([
      { $match: { manhua: { $in: ids } } },
      {
        $group: {
          _id: "$manhua",
          totalChapters: { $sum: 1 },
          deletedChapters: {
            $sum: { $cond: [{ $ne: ["$deletedAt", null] }, 1, 0] },
          },
        },
      },
    ]);
    const cmap = new Map(counts.map((c) => [String(c._id), c]));

    res.json(
      manhuas.map((m) => ({
        ...m,
        chapterStats: cmap.get(String(m._id)) || {
          totalChapters: 0,
          deletedChapters: 0,
        },
      }))
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/trash/manhuas/:id — устгасан манхуагийн дэлгэрэнгүй + chapter-ууд
exports.getDeletedManhuaDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const manhua = await Manhua.findById(id)
      .setOptions({ withDeleted: true })
      .populate("createdBy", "username email")
      .populate("deletedBy", "username email")
      .lean();
    if (!manhua) return res.status(404).json({ message: "Manhua not found" });

    const chapters = await Chapter.find({ manhua: id })
      .setOptions({ withDeleted: true })
      .sort({ chapterNumber: 1 })
      .select("chapterNumber title status views deletedAt deletedBy createdAt updatedAt")
      .populate("deletedBy", "username")
      .lean();

    res.json({ ...manhua, chapters });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/trash/chapters — устгасан chapter жагсаалт (бүх манхуа)
exports.listDeletedChapters = async (req, res, next) => {
  try {
    const chapters = await Chapter.find({ deletedAt: { $ne: null } })
      .setOptions({ withDeleted: true })
      .populate({
        path: "manhua",
        select: "title slug deletedAt",
        options: { withDeleted: true },
      })
      .populate("deletedBy", "username email")
      .sort({ deletedAt: -1 })
      .lean();

    res.json(chapters);
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/trash/manhuas/:id/restore — манхуа сэргээх
// createdBy → admin, chapter-ууд хамт сэргэнэ
exports.restoreManhua = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const manhua = await Manhua.findById(id)
      .setOptions({ withDeleted: true })
      .lean();
    if (!manhua) return res.status(404).json({ message: "Manhua not found" });
    if (!manhua.deletedAt) {
      return res.status(400).json({ message: "Manhua устгагдаагүй байна" });
    }

    // 🔄 Restore: createdBy → admin (сэргээсэн)
    await Manhua.updateOne(
      { _id: id },
      {
        $set: {
          deletedAt: null,
          deletedBy: null,
          createdBy: req.user._id,
        },
      }
    );

    // Chapter-уудыг хамт сэргээнэ — зөвхөн манхуатайгаа хамт устсаныг
    await Chapter.updateMany(
      { manhua: id, deletedAt: manhua.deletedAt },
      { $set: { deletedAt: null, deletedBy: null } }
    );

    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    cache.delPrefix("editor:manhuas:mine:");

    res.json({ success: true, message: "Manhua restored" });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/trash/chapters/:id/restore — chapter сэргээх
exports.restoreChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const chapter = await Chapter.findById(id)
      .setOptions({ withDeleted: true })
      .lean();
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (!chapter.deletedAt) {
      return res.status(400).json({ message: "Chapter устгагдаагүй байна" });
    }

    // Манхуа нь устсан бол өмнө манхуагаа сэргээх ёстой
    const manhua = await Manhua.findById(chapter.manhua)
      .setOptions({ withDeleted: true })
      .lean();
    if (manhua?.deletedAt) {
      return res.status(400).json({
        message: "Эхлээд манхуагийн сэргээх шаардлагатай",
      });
    }

    await Chapter.updateOne(
      { _id: id },
      { $set: { deletedAt: null, deletedBy: null } }
    );

    res.json({ success: true, message: "Chapter restored" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/trash/manhuas/:id — бүрмөсөн устгах
exports.permanentDeleteManhua = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const manhua = await Manhua.findById(id)
      .setOptions({ withDeleted: true })
      .lean();
    if (!manhua) return res.status(404).json({ message: "Manhua not found" });
    if (!manhua.deletedAt) {
      return res.status(400).json({ message: "Эхлээд trash руу шилжүүл" });
    }

    await Chapter.deleteMany({ manhua: id }).setOptions({ withDeleted: true });
    await Manhua.deleteOne({ _id: id }).setOptions({ withDeleted: true });

    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");

    res.json({ success: true, message: "Permanently deleted" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/trash/chapters/:id — бүрмөсөн устгах
exports.permanentDeleteChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const chapter = await Chapter.findById(id)
      .setOptions({ withDeleted: true })
      .lean();
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (!chapter.deletedAt) {
      return res.status(400).json({ message: "Эхлээд trash руу шилжүүл" });
    }

    await Chapter.deleteOne({ _id: id }).setOptions({ withDeleted: true });

    res.json({ success: true, message: "Permanently deleted" });
  } catch (err) {
    next(err);
  }
};
