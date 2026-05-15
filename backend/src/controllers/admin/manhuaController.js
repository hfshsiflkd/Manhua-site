const Manhua = require("../../models/Manhua");
const cache = require("../../utils/cache");
const { invalidatePublicManhuaCache } = require("../../utils/invalidatePublicManhuaCache");

// TTL (хүсвэл өөрчил)
const TTL_LIST = 30_000; // 30s
const TTL_DETAIL = 60_000; // 60s

exports.listManhuasWithOwner = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const lim = Math.min(Number(limit) || 0, 100);

    const cacheKey = `admin:manhuas:list:limit=${lim || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let query = Manhua.find({})
      .populate("createdBy", "username email role")
      .sort({ createdAt: -1 });

    if (lim) query = query.limit(lim);

    const manhuas = await query.lean();

    cache.set(cacheKey, manhuas, TTL_LIST);
    res.json((manhas = manhuas));
  } catch (err) {
    next(err);
  }
};

exports.getManhuaDetailAdmin = async (req, res, next) => {
  try {
    const id = req.params.id;
    const cacheKey = `admin:manhuas:detail:${id}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const manhua = await Manhua.findById(id)
      .populate("createdBy", "username email role createdAt")
      .populate("owners", "username email role")
      .lean();

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    cache.set(cacheKey, manhua, TTL_DETAIL);
    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/manhuas/:id/owners — body: { ownerIds: string[] }
// Манхуагийн эзэмшигчдийг шинэчилнэ.
exports.setManhuaOwners = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { ownerIds } = req.body;

    if (!Array.isArray(ownerIds)) {
      return res
        .status(400)
        .json({ message: "ownerIds массив байх ёстой" });
    }

    // 24-char hex шалгалт
    const valid = ownerIds.every((x) => /^[0-9a-fA-F]{24}$/.test(String(x)));
    if (!valid) {
      return res.status(400).json({ message: "ownerIds-д буруу id байна" });
    }

    // Давхардлыг арилгана
    const unique = [...new Set(ownerIds.map(String))];

    const manhua = await Manhua.findByIdAndUpdate(
      id,
      { $set: { owners: unique } },
      { new: true }
    )
      .populate("createdBy", "username email role")
      .populate("owners", "username email role")
      .lean();

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    cache.delPrefix("editor:manhuas:mine:");

    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

exports.updateManhuaAdmin = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Field whitelist — prevent mass-assignment of _id, createdBy, deletedAt, views, etc.
    const ALLOWED_FIELDS = [
      "title",
      "titleEn",
      "description",
      "coverImage",
      "coverImageUrl",
      "status",
      "genres",
      "rating",
    ];
    const update = {};
    for (const key of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    const manhua = await Manhua.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "username email role")
      .lean();

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    cache.delPrefix("editor:manhuas:mine:");

    res.json(manhua);
  } catch (err) {
    next(err);
  }
};

exports.deleteManhuaAdmin = async (req, res, next) => {
  try {
    const id = req.params.id;

    const manhua = await Manhua.findById(id).lean();
    if (!manhua) return res.status(404).json({ message: "Manhua not found" });

    // 🗑️ Soft delete: манхуа + холбогдох chapter-ууд
    const now = new Date();
    await Manhua.updateOne(
      { _id: id },
      { $set: { deletedAt: now, deletedBy: req.user._id } }
    );
    const Chapter = require("../../models/Chapter");
    await Chapter.updateMany(
      { manhua: id, deletedAt: null },
      { $set: { deletedAt: now, deletedBy: req.user._id } }
    );

    // ✅ cache invalidate (admin + public)
    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    cache.delPrefix("editor:manhuas:mine:");
    await invalidatePublicManhuaCache();

    res.json({ message: "Manhua moved to trash" });
  } catch (err) {
    next(err);
  }
};
