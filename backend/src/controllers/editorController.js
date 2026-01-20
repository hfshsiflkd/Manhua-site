const Manhua = require("../models/Manhua");
const Team = require("../models/Team");
const cache = require("../utils/cache");

const TTL_MINE = 30_000; // 30s

/**
 * GET /api/editor/manhuas/mine
 */
exports.getMyManhuas = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const cacheKey = `editor:manhuas:mine:${userId}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const teams = await Team.find({ "members.user": req.user._id })
      .select("_id")
      .lean();
    const teamIds = teams.map((t) => t._id);

    const query =
      teamIds.length > 0
        ? { $or: [{ createdBy: req.user._id }, { team: { $in: teamIds } }] }
        : { createdBy: req.user._id };

    const manhuas = await Manhua.find(query).sort({ createdAt: -1 }).lean();

    cache.set(cacheKey, manhuas, TTL_MINE);
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
      description,
      slug,
      status: status || "ongoing",
      coverImage: coverImage || coverImageUrl,
      coverImageUrl: coverImageUrl || coverImage,
      genres: Array.isArray(genres) ? genres : [],
      createdBy: req.user._id,
      team: teamId || null,
    });

    // ✅ cache invalidate (mine list)
    cache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    if (teamId) {
      for (const m of team.members || []) {
        cache.del(`editor:manhuas:mine:${String(m.user)}`);
      }
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
    const manhua = await Manhua.findById(id);

    if (!manhua) {
      return res.status(404).json({ message: "Manhua not found" });
    }

    let hasAccess = req.user.role === "admin";
    if (!hasAccess && String(manhua.createdBy) === String(req.user._id)) {
      hasAccess = true;
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

    if (req.body.teamId !== undefined) {
      if (req.body.teamId) {
        const team = await Team.findById(req.body.teamId).lean();
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
          return res
            .status(403)
            .json({ message: "Team тохируулах эрхгүй" });
        }
        req.body.team = req.body.teamId;
      } else {
        req.body.team = null;
      }
    }

    const oldTeamId = manhua.team ? String(manhua.team) : null;

    const doc = await Manhua.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();

    // ✅ cache invalidate
    cache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    cache.del(`admin:manhuas:detail:${id}`);
    cache.delPrefix("admin:manhuas:list:");
    if (oldTeamId) {
      const oldTeam = await Team.findById(oldTeamId).lean();
      for (const m of oldTeam?.members || []) {
        cache.del(`editor:manhuas:mine:${String(m.user)}`);
      }
    }
    if (doc?.team && String(doc.team) !== oldTeamId) {
      const newTeam = await Team.findById(doc.team).lean();
      for (const m of newTeam?.members || []) {
        cache.del(`editor:manhuas:mine:${String(m.user)}`);
      }
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
};
