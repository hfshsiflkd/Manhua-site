"use strict";

const { isPostgres } = require("../store/driver");
const { withTransaction } = require("../db/postgres");
const { TERMS_VERSION, SKILLS, EXPERIENCE, LANGUAGES, isSelfServeSignupEnabled } = require("../config/selfServeEditor");

class FieldError extends Error {
  constructor(fields, message = "Мэдээллээ шалгана уу.") {
    super(message);
    this.name = "FieldError";
    this.statusCode = 400;
    this.code = "VALIDATION";
    this.fields = fields;
  }
}

function asString(value) {
  return String(value == null ? "" : value).trim();
}

function pickOnboarding(body) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return {
    penName: src.penName,
    bio: src.bio,
    skills: src.skills,
    experience: src.experience,
    languages: src.languages,
    customLanguage: src.customLanguage,
    portfolioUrl: src.portfolioUrl,
    acceptTerms: src.acceptTerms,
  };
}

function normalizeSkills(value) {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map((s) => String(s || "").trim()).filter((s) => SKILLS.includes(s)))];
}

function normalizeLanguages(value, customLanguage) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  for (const item of list) {
    const code = String(item || "").trim().toLowerCase();
    if (LANGUAGES.includes(code) && !out.includes(code)) out.push(code);
  }
  const custom = asString(customLanguage);
  if (custom) {
    if (custom.length < 2 || custom.length > 40) {
      throw new FieldError({ customLanguage: "Хэл 2–40 тэмдэгт байна." });
    }
    const key = custom.toLowerCase();
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

function pickProfileUpdate(body) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return {
    penName: src.penName,
    bio: src.bio,
    skills: src.skills,
    experience: src.experience,
    languages: src.languages,
    customLanguage: src.customLanguage,
    portfolioUrl: src.portfolioUrl,
  };
}

function validateProfileUpdate(raw, { requireExperience = false } = {}) {
  const fields = {};
  const penName = asString(raw.penName);
  if (penName.length < 2 || penName.length > 40) {
    fields.penName = "Нийтлэгчийн нэр 2–40 тэмдэгт байна.";
  }
  const bio = asString(raw.bio);
  if (bio.length < 20 || bio.length > 500) {
    fields.bio = "Танилцуулга 20–500 тэмдэгт байна.";
  }
  const skills = normalizeSkills(raw.skills);
  if (!skills.length) {
    fields.skills = "Хийж чаддаг ажлаа дор хаяж нэгийг сонгоно уу.";
  }
  let experience = asString(raw.experience);
  if (requireExperience || experience) {
    if (!EXPERIENCE.includes(experience)) {
      fields.experience = "Туршлагаа сонгоно уу.";
    }
  } else {
    experience = "";
  }
  let languages = [];
  try {
    languages = normalizeLanguages(raw.languages, raw.customLanguage);
  } catch (err) {
    if (err instanceof FieldError) Object.assign(fields, err.fields);
    else throw err;
  }
  if (!languages.length) {
    fields.languages = "Ажиллах хэлээ дор хаяж нэгийг сонгох эсвэл нэмнэ үү.";
  }
  let portfolioUrl = asString(raw.portfolioUrl);
  if (portfolioUrl) {
    if (portfolioUrl.length > 200) {
      fields.portfolioUrl = "Холбоос хамгийн ихдээ 200 тэмдэгт байна.";
    } else {
      try {
        const parsed = new URL(portfolioUrl);
        if (parsed.protocol !== "https:") {
          fields.portfolioUrl = "Зөвхөн HTTPS холбоос оруулна уу.";
        } else {
          portfolioUrl = parsed.toString();
        }
      } catch {
        fields.portfolioUrl = "Зөв HTTPS холбоос оруулна уу.";
      }
    }
  } else {
    portfolioUrl = null;
  }
  if (Object.keys(fields).length) throw new FieldError(fields);
  return {
    penName,
    bio,
    skills,
    experience: experience || null,
    languages,
    portfolioUrl,
  };
}

function validateAndNormalize(raw) {
  const fields = {};
  const penName = asString(raw.penName);
  if (penName.length < 2 || penName.length > 40) {
    fields.penName = "Нийтлэгчийн нэр 2–40 тэмдэгт байна.";
  }
  const bio = asString(raw.bio);
  if (bio.length < 20 || bio.length > 500) {
    fields.bio = "Танилцуулга 20–500 тэмдэгт байна.";
  }
  const skills = normalizeSkills(raw.skills);
  if (!skills.length) {
    fields.skills = "Хийж чаддаг ажлаа дор хаяж нэгийг сонгоно уу.";
  }
  const experience = asString(raw.experience);
  if (!EXPERIENCE.includes(experience)) {
    fields.experience = "Туршлагаа сонгоно уу.";
  }
  let languages = [];
  try {
    languages = normalizeLanguages(raw.languages, raw.customLanguage);
  } catch (err) {
    if (err instanceof FieldError) Object.assign(fields, err.fields);
    else throw err;
  }
  if (!languages.length) {
    fields.languages = "Ажиллах хэлээ дор хаяж нэгийг сонгох эсвэл нэмнэ үү.";
  }
  let portfolioUrl = asString(raw.portfolioUrl);
  if (portfolioUrl) {
    if (portfolioUrl.length > 200) {
      fields.portfolioUrl = "Холбоос хамгийн ихдээ 200 тэмдэгт байна.";
    } else {
      try {
        const parsed = new URL(portfolioUrl);
        if (parsed.protocol !== "https:") {
          fields.portfolioUrl = "Зөвхөн HTTPS холбоос оруулна уу.";
        } else {
          portfolioUrl = parsed.toString();
        }
      } catch {
        fields.portfolioUrl = "Зөв HTTPS холбоос оруулна уу.";
      }
    }
  } else {
    portfolioUrl = null;
  }
  if (raw.acceptTerms !== true) {
    fields.acceptTerms = "Нийтлэх дүрмийг зөвшөөрсний дараа үргэлжлүүлнэ үү.";
  }
  if (Object.keys(fields).length) throw new FieldError(fields);
  return {
    penName,
    bio,
    skills,
    experience,
    languages,
    portfolioUrl,
    termsVersion: TERMS_VERSION,
  };
}

function rowToProfile(row) {
  if (!row) return null;
  return {
    penName: row.pen_name,
    bio: row.bio,
    skills: row.skills || [],
    experience: row.experience,
    languages: row.languages || [],
    portfolioUrl: row.portfolio_url || null,
    termsVersion: row.terms_version,
    termsAcceptedAt: row.terms_accepted_at,
    selfServe: row.self_serve,
    createdAt: row.created_at,
  };
}

function assertEligible(user) {
  if (!user) {
    const err = new Error("Нэвтэрсэн байх шаардлагатай");
    err.statusCode = 401;
    throw err;
  }
  if (user.blocked || user.isActive === false) {
    const err = new Error("Энэ бүртгэл идэвхгүй эсвэл хориглогдсон байна.");
    err.statusCode = 403;
    err.code = "ACCOUNT_DISABLED";
    throw err;
  }
  if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
    const lockUntil = new Date(user.lockUntil);
    const err = new Error("Түр түгжигдсэн. Дахин оролдоно уу.");
    err.statusCode = 423;
    err.meta = {
      lockUntil: lockUntil.toISOString(),
      reason: user.lockReason || "LOCKED",
      remainingSeconds: Math.ceil((lockUntil.getTime() - Date.now()) / 1000),
    };
    throw err;
  }
  const role = String(user.role || "user");
  if (role === "admin" || role === "translator") {
    const err = new Error("Энэ бүртгэл аль хэдийн удирдлагын эрхтэй тул editor болгох боломжгүй.");
    err.statusCode = 403;
    err.code = "ROLE_PROTECTED";
    throw err;
  }
}

async function becomeEditor({ user, body }) {
  if (!isPostgres()) {
    const err = new Error("Editor бүртгэл одоогоор боломжгүй.");
    err.statusCode = 503;
    throw err;
  }
  if (!isSelfServeSignupEnabled() && String(user.role || "user") !== "editor") {
    const err = new Error("Одоогоор шинээр editor болох боломжгүй.");
    err.statusCode = 403;
    err.code = "SELF_SERVE_SIGNUP_DISABLED";
    throw err;
  }
  assertEligible(user);
  const profile = validateAndNormalize(pickOnboarding(body));
  const userId = String(user._id || user.id);
  const extra = user.extra && typeof user.extra === "object" ? user.extra : {};

  return withTransaction(async (client) => {
    const locked = await client.query(`SELECT * FROM arc.users WHERE id=$1 FOR UPDATE`, [userId]);
    if (!locked.rowCount) {
      const err = new Error("Хэрэглэгч олдсонгүй");
      err.statusCode = 404;
      throw err;
    }
    const row = locked.rows[0];
    const current = {
      _id: row.id,
      role: row.role,
      blocked: row.blocked,
      isActive: row.is_active,
      lockUntil: row.lock_until,
      lockReason: row.lock_reason,
      extra: row.extra || {},
    };
    assertEligible(current);

    if (current.role === "editor") {
      const existing = await client.query(`SELECT * FROM arc.editor_profiles WHERE user_id=$1`, [userId]);
      return {
        alreadyEditor: true,
        role: "editor",
        profile: rowToProfile(existing.rows[0]) || profile,
      };
    }

    await client.query(
      `INSERT INTO arc.editor_profiles (
        user_id, pen_name, bio, skills, experience, languages, portfolio_url,
        terms_version, terms_accepted_at, self_serve, extra, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4::text[],$5,$6::text[],$7,$8,now(), true, $9::jsonb, now(), now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        pen_name = EXCLUDED.pen_name,
        bio = EXCLUDED.bio,
        skills = EXCLUDED.skills,
        experience = EXCLUDED.experience,
        languages = EXCLUDED.languages,
        portfolio_url = EXCLUDED.portfolio_url,
        terms_version = EXCLUDED.terms_version,
        terms_accepted_at = EXCLUDED.terms_accepted_at,
        self_serve = true,
        extra = arc.editor_profiles.extra || EXCLUDED.extra,
        updated_at = now()`,
      [
        userId,
        profile.penName,
        profile.bio,
        profile.skills,
        profile.experience,
        profile.languages,
        profile.portfolioUrl,
        profile.termsVersion,
        JSON.stringify(extra.pgitest ? { pgitest: true } : {}),
      ]
    );

    if (current.extra?.pgitest === true && current.extra?.pgitestTxFail) {
      throw new Error("pgitest forced rollback");
    }

    const updated = await client.query(
      `UPDATE arc.users
       SET role='editor',
           extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('editorSince', to_jsonb(now()::text)),
           updated_at=now()
       WHERE id=$1 AND role='user'
       RETURNING role`,
      [userId]
    );
    if (!updated.rowCount) {
      throw new Error("role update failed");
    }

    const saved = await client.query(`SELECT * FROM arc.editor_profiles WHERE user_id=$1`, [userId]);
    return {
      alreadyEditor: false,
      role: "editor",
      profile: rowToProfile(saved.rows[0]),
    };
  });
}

module.exports = {
  FieldError,
  pickOnboarding,
  pickProfileUpdate,
  validateAndNormalize,
  validateProfileUpdate,
  becomeEditor,
  rowToProfile,
  assertEligible,
};
