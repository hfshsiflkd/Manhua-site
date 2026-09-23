"use strict";

const User = require("../models/User");
const { genJwt } = require("../utils/token");
const { invalidateUserCache } = require("../middleware/authMiddleware");
const { logAudit } = require("../utils/auditLogger");
const { becomeEditor, FieldError, rowToProfile } = require("../services/editorOnboardingService");
const { TERMS_VERSION } = require("../config/selfServeEditor");
const { isPostgres } = require("../store/driver");
const { query } = require("../db/postgres");

function publicUser(user) {
  return {
    _id: user._id || user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isVIP: Boolean(user.isVIP),
    vipExpiresAt: user.vipExpiresAt || null,
    avatar: user.avatar || null,
  };
}

const SKILLS_META = [
  { id: "translation", label: "Орчуулга" },
  { id: "cleanup", label: "Зураг цэвэрлэх" },
  { id: "typesetting", label: "Текст өрөх" },
  { id: "proofreading", label: "Хянах" },
];
const EXPERIENCE_META = [
  { id: "beginner", label: "Анхлан" },
  { id: "previous", label: "Өмнө ажиллаж байсан" },
  { id: "regular", label: "Тогтмол хийдэг" },
];
const LANGUAGE_META = [
  { id: "mn", label: "Монгол" },
  { id: "en", label: "Англи" },
  { id: "zh", label: "Хятад" },
  { id: "ja", label: "Япон" },
  { id: "ko", label: "Солонгос" },
  { id: "ru", label: "Орос" },
];

exports.getEditorOnboardingMeta = async (req, res, next) => {
  try {
    const role = String(req.user.role || "user");
    let profile = null;
    let selfServe = false;
    if (isPostgres()) {
      const r = await query(`SELECT * FROM arc.editor_profiles WHERE user_id=$1`, [
        String(req.user._id || req.user.id),
      ]);
      profile = rowToProfile(r.rows[0]);
      selfServe = Boolean(r.rows[0]?.self_serve);
    }
    const locked = req.user.lockUntil && new Date(req.user.lockUntil).getTime() > Date.now();
    const eligible =
      role === "user" &&
      !req.user.blocked &&
      req.user.isActive !== false &&
      !locked;
    return res.json({
      termsVersion: TERMS_VERSION,
      skills: SKILLS_META,
      experience: EXPERIENCE_META,
      languages: LANGUAGE_META,
      role,
      eligible,
      alreadyEditor: role === "editor",
      staff: role === "admin" || role === "translator",
      selfServe,
      profile,
    });
  } catch (err) {
    return next(err);
  }
};

exports.becomeEditor = async (req, res, next) => {
  try {
    const result = await becomeEditor({ user: req.user, body: req.body });
    const fresh = await User.findById(req.user._id || req.user.id);
    if (!fresh) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }
    await invalidateUserCache(String(fresh._id));
    const token = genJwt(fresh);

    logAudit(req, {
      level: "INFO",
      category: "auth",
      action: result.alreadyEditor ? "become_editor_idempotent" : "become_editor",
      message: `User became editor: ${fresh.username}`,
      meta: {
        alreadyEditor: result.alreadyEditor,
        termsVersion: result.profile?.termsVersion || TERMS_VERSION,
      },
    }).catch(() => {});

    return res.status(result.alreadyEditor ? 200 : 201).json({
      success: true,
      alreadyEditor: result.alreadyEditor,
      token,
      user: publicUser(fresh),
      profile: result.profile,
    });
  } catch (err) {
    if (err instanceof FieldError) {
      return res.status(400).json({
        success: false,
        message: err.message,
        code: err.code,
        fields: err.fields,
      });
    }
    if (err.statusCode === 423) {
      return res.status(423).json({
        success: false,
        message: err.message,
        code: err.meta?.reason || "LOCKED",
        ...(err.meta || {}),
      });
    }
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || undefined,
      });
    }
    return next(err);
  }
};
