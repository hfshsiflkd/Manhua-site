const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const logAction = require("../utils/logAction");

// Admin + Translator: Manhua нэмэх
exports.createManhua = async (req, res) => {
  try {
    const { title, description, coverImage, genres, status } = req.body;

    const manhua = await Manhua.create({
      title,
      description,
      coverImage,
      genres,
      status,
      createdBy: req.user._id,
    });

    await logAction({
      userId: req.user._id,
      action: "CREATE_MANHUA",
      targetType: "Manhua",
      targetId: manhua._id,
      description: `${req.user.username} created manhua ${manhua.title}`,
    });

    res.status(201).json(manhua);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

// Admin + Translator: Chapter нэмэх
exports.createChapter = async (req, res) => {
  try {
    const { manhuaId } = req.params;
    const { number, title, pages } = req.body; // pages = [url1, url2, ...]

    const chapter = await Chapter.create({
      manhua: manhuaId,
      number,
      title,
      pages,
      createdBy: req.user._id,
    });

    await logAction({
      userId: req.user._id,
      action: "CREATE_CHAPTER",
      targetType: "Chapter",
      targetId: chapter._id,
      description: `${req.user.username} created chapter ${number} for manhua ${manhuaId}`,
    });

    res.status(201).json(chapter);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

// Admin + Translator: Manhua update
exports.updateManhua = async (req, res) => {
  try {
    const { id } = req.params;
    const manhua = await Manhua.findById(id);
    if (!manhua) return res.status(404).json({ message: "Олдсонгүй" });

    Object.assign(manhua, req.body);
    await manhua.save();

    await logAction({
      userId: req.user._id,
      action: "UPDATE_MANHUA",
      targetType: "Manhua",
      targetId: manhua._id,
      description: `${req.user.username} updated manhua ${manhua.title}`,
      meta: { body: req.body },
    });

    res.json(manhua);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};
