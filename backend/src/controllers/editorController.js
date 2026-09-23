const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const Team = require("../models/Team");
const cache = require("../utils/cache");
const redisCache = require("../cache/redisCache");
const { invalidatePublicManhuaCache } = require("../utils/invalidatePublicManhuaCache");
const mongoose = require("mongoose");
const { makeSlug } = require("../store/pg/helpers");
const { isPostgres } = require("../store/driver");
const { query } = require("../db/postgres");
const quota = require("../services/editorQuotaService");

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

function candidateSlug(input, attempt) {
  const base = makeSlug(input) || "manhua";
  if (attempt === 0) return base;
  return `${base}-${attempt + 1}`;
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
 * GET /api/editor/manhuas/similar?title=
 */
exports.getSimilarManhuas = async (req, res, next) => {
  try {
    const title = String(req.query.title || req.query.q || "").trim();
    if (title.length < 2) return res.json({ items: [] });
    if (!isPostgres()) return res.json({ items: [] });
    const escaped = title.replace(/[%_\\]/g, "\\$&");
    const r = await query(
      `SELECT id, title, title_en, slug, cover_image, cover_image_url,
              GREATEST(similarity(title, $1), similarity(coalesce(title_en,''), $1)) AS sim
       FROM arc.manhuas
       WHERE deleted_at IS NULL
         AND extra->>'quarantinePlaceholder' IS DISTINCT FROM 'true'
         AND (
           title ILIKE $2 ESCAPE '\\'
           OR coalesce(title_en,'') ILIKE $2 ESCAPE '\\'
           OR similarity(title, $1) > 0.2
           OR similarity(coalesce(title_en,''), $1) > 0.2
         )
       ORDER BY sim DESC, updated_at DESC
       LIMIT 8`,
      [title, `%${escaped}%`]
    );
    res.json({
      items: r.rows.map((row) => ({
        _id: row.id,
        title: row.title,
        titleEn: row.title_en,
        slug: row.slug,
        coverImage: row.cover_image || row.cover_image_url,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/editor/manhuas
 */
exports.createManhua = async (req, res, next) => {
  const idempotencyKey = String(
    req.body?.idempotencyKey || req.headers["idempotency-key"] || `manhua:${req.user._id}:${Date.now()}`
  ).slice(0, 180);
  let reserved = false;
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
    } = req.body || {};

    if (!title) {
      return res.status(400).json({ message: "Манхвагийн нэр шаардлагатай." });
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

    const coverUrl = coverImage || coverImageUrl;
    if (coverUrl) {
      await quota.assertSelfServeAssetUrls(req.user, [coverUrl], {
        ownerIds: teamId ? await quota.collectTeamAssetOwnerIds(teamId) : [],
      });
    }

    const reservation = await quota.reserveManhua({ user: req.user, idempotencyKey });
    reserved = !reservation?.skipped;
    if (reservation?.status === "committed" && reservation.replayed) {
      const existingId = reservation.extra?.manhuaId;
      if (existingId) {
        const existing = await Manhua.findById(existingId);
        if (existing) return res.status(200).json(existing);
      }
    }

    let doc = null;
    let slugAdjusted = false;
    for (let i = 0; i < 8; i += 1) {
      const trySlug = candidateSlug({ slug, titleEn, title }, i);
      try {
        doc = await Manhua.create({
          title,
          titleEn,
          description,
          slug: trySlug,
          status: status || "ongoing",
          coverImage: coverUrl,
          coverImageUrl: coverUrl,
          genres: Array.isArray(genres) ? genres : [],
          createdBy: req.user._id,
          owners: [req.user._id],
          team: teamId || null,
        });
        slugAdjusted = i > 0;
        break;
      } catch (err) {
        if (err.code === 11000 && i < 7) continue;
        throw err;
      }
    }
    if (!doc) {
      return res.status(409).json({
        message: "Энэ холбоос (slug) аль хэдийн ашиглагдсан байна. Өөр нэр эсвэл slug оруулна уу.",
        code: "SLUG_CONFLICT",
      });
    }

    if (reserved) {
      await quota.commitReservation({
        user: req.user,
        kind: "manhua",
        idempotencyKey,
        bytes: 0,
        extra: { manhuaId: String(doc._id) },
      });
    }

    await redisCache.del(`editor:manhuas:mine:${String(req.user._id)}`);
    if (teamId) {
      await Promise.all(
        (team.members || []).map((m) =>
          redisCache.del(`editor:manhuas:mine:${String(m.user)}`)
        )
      );
    }
    cache.delPrefix("admin:manhuas:list:");

    const payload = typeof doc.toObject === "function" ? doc.toObject() : doc;
    res.status(201).json({ ...payload, slugAdjusted });
  } catch (err) {
    if (reserved) {
      await quota.releaseReservation({ user: req.user, kind: "manhua", idempotencyKey }).catch(() => {});
    }
    if (err.code === "SELF_SERVE_QUOTA") {
      return res.status(429).json({ message: err.message, code: err.code, quota: err.quota });
    }
    if (err.statusCode === 403) {
      return res.status(403).json({ message: err.message, code: err.code });
    }
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(409).json({
        message: "Энэ холбоос (slug) аль хэдийн ашиглагдсан байна. Өөр slug оруулна уу.",
        code: "SLUG_CONFLICT",
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
    const nextCover = updates.coverImage || updates.coverImageUrl;
    if (nextCover) {
      await quota.assertSelfServeAssetUrls(req.user, [nextCover], {
        existingUrls: [manhua.coverImage, manhua.coverImageUrl],
        ownerIds: await quota.collectAssetOwnerIds(manhua),
      });
    }
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
