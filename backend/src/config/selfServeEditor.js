"use strict";

const MiB = 1024 * 1024;

/** Product defaults for self-serve editors only. Legacy admin/editor/translator are not auto-enrolled. */
const TERMS_VERSION = process.env.EDITOR_TERMS_VERSION || "2026-09-23";
const MANHUA_LIMIT_PER_DAY = Number(process.env.SELF_SERVE_EDITOR_MANHUA_LIMIT_PER_DAY || 5);
const UPLOAD_BYTES_PER_DAY = Number(
  process.env.SELF_SERVE_EDITOR_UPLOAD_BYTES_PER_DAY || 500 * MiB
);
const QUOTA_WINDOW_HOURS = Number(process.env.SELF_SERVE_EDITOR_QUOTA_WINDOW_HOURS || 24);

const SKILLS = ["translation", "cleanup", "typesetting", "proofreading"];
const EXPERIENCE = ["beginner", "previous", "regular"];
const LANGUAGES = ["mn", "en", "zh", "ja", "ko", "ru"];

function quotaWindowMs() {
  return QUOTA_WINDOW_HOURS * 60 * 60 * 1000;
}

/** Server-side signup switch. Default on. Existing editors keep role, publish rights, and quotas. */
function isSelfServeSignupEnabled() {
  const raw = process.env.SELF_SERVE_EDITOR_SIGNUP;
  if (raw == null || String(raw).trim() === "") return true;
  return !["0", "false", "off", "no"].includes(String(raw).trim().toLowerCase());
}

module.exports = {
  MiB,
  TERMS_VERSION,
  MANHUA_LIMIT_PER_DAY,
  UPLOAD_BYTES_PER_DAY,
  QUOTA_WINDOW_HOURS,
  SKILLS,
  EXPERIENCE,
  LANGUAGES,
  quotaWindowMs,
  isSelfServeSignupEnabled,
};
