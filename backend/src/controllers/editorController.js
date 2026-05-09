const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const Team = require("../models/Team");
const cache = require("../utils/cache");
const redisCache = require("../cache/redisCache");
const { invalidatePublicManhuaCache } = require("../utils/invalidatePublicManhuaCache");
const mongoose = require("mongoose");

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

// 🗝️ Редис нь serverless бүх process-д нийтлэг — invalidation бүгдэд хүрнэ
const TTL_MINE_SEC = 30; // 30s

/**
 * GET /api/editor/manhuas/mine
 */
exports.getMyManhuas = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const cacheKey = `editor:manhuas:mine:${userId}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) return res.json(cached);

    const teams = await Team.find({ "members.user": req.user._id })
      .select("_id")
      .lean();
    const teamIds = teams.map((t) => t._id);

    const orConditions = [
      { createdBy: req.user._id },
      { owners: req.user._id }, // 👥 хамт ажилладаг манхуа
    ];
    if (teamIds.length > 0) orConditions.push({ team: { $in: teamIds } });
    const query = { $or: orConditions };

    const manhuas = await Manhua.find(query).sort({ createdAt: -1 }).lean();

    redisCache.set(cacheKey, manhuas, TTL_MINE_SEC).catch(() => {});
    res.json(manhuas);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/editor/manhuas
 */
exports.createManhua = async (req, res, next) => {
  try {
    const {
      title,
      titleEn,
      description,
      coverImage,
      coverImageUrl,
      slug,
      status,
      genres,
      teamId,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    let team = null;
    if (teamId) {
      if (!isValidId(teamId)) {
        return res.status(400).json({ message: "Team ID буруу байна" });
      }
      team = await Team.findById(teamId).lean();
      if (!team) {
        return res.status(404).json({ message: "Team олдсонгүй" });
      }

      const member = team.members?.find(
        (m) => String(m.user) === String(req.user._id)
      );
      const canUseTeam =
        req.user.role === "admin" ||
        member?.role === "owner" ||
        member?.role === "admin" ||
        member?.role === "editor";

      if (!canUseTeam) {
        return res
          .status(403)
          .json({ message: "Team дээр манхуа үүсгэх эрхгүй" });
      }
    }

    const doc = await Manhua.create({
      title,
      titleEn,
      description,
      slug,
      status: status || "ongoing",
      coverImage: coverImage || coverImageUrl,
      coverImageUrl: coverImageUrl || coverImage,
      genres: Array.isArray(genres) ? genres : [],
      createdBy: req.user._id,
      team: teamId || null,
    });

    // ✅ cache invalidate (mine list) — await чухал: response явахаас өмнө Redis-ийн DEL дуусна
    await redisCache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    if (teamId) {
      await Promise.all(
        (team.members || []).map((m) =>
          redisCache.del(`editor:manhuas:mine:${String(m.user)}`)
        )
      );
    }
    cache.delPrefix("admin:manhuas:list:");

    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(400).json({
        message: "Энэ slug аль хэдийн ашиглагдсан байна. Өөр slug оруул.",
      });
    }
    next(err);
  }
};

/**
 * PATCH /api/editor/manhuas/:id
 */
exports.updateManhua = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Manhua ID буруу байна" });
    }
    const manhua = await Manhua.findById(id);

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    let hasAccess = req.user.role === "admin";
    if (!hasAccess) {
      const uid = String(req.user._id);
      const isOwner =
        String(manhua.createdBy) === uid ||
        (Array.isArray(manhua.owners) &&
          manhua.owners.some((o) => String(o) === uid));
      if (isOwner) hasAccess = true;
    }

    if (!hasAccess && manhua.team) {
      const team = await Team.findById(manhua.team).lean();
      const member = team?.members?.find(
        (m) => String(m.user) === String(req.user._id)
      );
      if (member?.role === "owner" || member?.role === "admin") {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: "No permission" });
    }

    // Зөвшөөрөгдсөн талбаруудыг цагаан жагсаалтаар шүүнэ (mass assignment хамгаалалт)
    const {
      title, titleEn, description, slug,
      status, coverImage, coverImageUrl, genres, teamId,
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (titleEn !== undefined) updates.titleEn = titleEn;
    if (description !== undefined) updates.description = description;
    if (slug !== undefined) updates.slug = slug;
    if (status !== undefined) updates.status = status;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
    if (genres !== undefined) updates.genres = Array.isArray(genres) ? genres : [];

    if (teamId !== undefined) {
      if (teamId) {
        if (!isValidId(teamId)) {
          return res.status(400).json({ message: "Team ID буруу байна" });
        }
        const team = await Team.findById(teamId).lean();
        if (!team) {
          return res.status(404).json({ message: "Team олдсонгүй" });
        }
        const member = team.members?.find(
          (m) => String(m.user) === String(req.user._id)
        );
        const canAssign =
          req.user.role === "admin" ||
          member?.role === "owner" ||
          member?.role === "admin" ||
          member?.role === "editor";
        if (!canAssign) {
          return res.status(403).json({ message: "Team тохируулах эрхгүй" });
        }
        updates.team = teamId;
      } else {
        updates.team = null;
      }
    }

    const oldTeamId = manhua.team ? String(manhua.team) : null;

    const doc = await Manhua.findByIdAndUpdate(id, updates, { new: true }).lean();

    // ✅ cache invalidate
    redisCache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    if (oldTeamId) {
      const oldTeam = await Team.findById(oldTeamId).lean();
      for (const m of oldTeam?.members || []) {
        redisCache.del(`editor:manhuas:mine:${String(m.user)}`);
      }
    }
    if (doc?.team && String(doc.team) !== oldTeamId) {
      const newTeam = await Team.findById(doc.team).lean();
      for (const m of newTeam?.members || []) {
        redisCache.del(`editor:manhuas:mine:${String(m.user)}`);
      }
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/editor/manhuas/:id
 */
exports.deleteManhua = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Manhua ID буруу байна" });
    }

    const manhua = await Manhua.findById(id).lean();
    if (!manhua) return res.status(404).json({ message: "Manhua not found" });

    // admin бол бүгдийг устгаж болно; editor/owner зөвхөн эзэмшдэг манхуагаа
    if (req.user.role !== "admin") {
      const uid = String(req.user._id);
      const isOwner =
        String(manhua.createdBy) === uid ||
        (Array.isArray(manhua.owners) &&
          manhua.owners.some((o) => String(o) === uid));
      if (!isOwner) {
        return res.status(403).json({ message: "Зөвхөн эзэмшигч манхуагаа устгаж болно" });
      }
    }

    // 🗑️ Soft delete: манхуа + chapter-ууд хамт
    const now = new Date();
    await Manhua.updateOne(
      { _id: id },
      { $set: { deletedAt: now, deletedBy: req.user._id } }
    );
    await Chapter.updateMany(
      { manhua: manhua._id, deletedAt: null },
      { $set: { deletedAt: now, deletedBy: req.user._id } }
    );

    await redisCache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    await invalidatePublicManhuaCache();

    res.json({ message: "Manhua moved to trash" });
  } catch (err) {
    next(err);
  }
};
