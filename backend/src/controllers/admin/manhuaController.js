const Manhua = require("../../models/Manhua");
const cache = require("../../utils/cache");

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

exports.updateManhuaAdmin = async (req, res, next) => {
  try {
    const id = req.params.id;

    const manhua = await Manhua.findByIdAndUpdate(id, req.body, {
      new: true,
    })
      .populate("createdBy", "username email role")
      .lean();

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    // ✅ cache invalidate
    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    cache.delPrefix("editor:manhuas:mine:"); // editor mine list ч өөрчлөгдөнө

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

    await Manhua.deleteOne({ _id: id });

    // ✅ cache invalidate
    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    cache.delPrefix("editor:manhuas:mine:");

    res.json({ message: "Manhua deleted" });
  } catch (err) {
    next(err);
  }
};
