"use strict";

const WORK_ROLES = ["translation", "cleanup", "typesetting", "proofreading"];
const COMPENSATION = ["volunteer", "paid", "negotiable"];
const LISTING_STATUSES = ["draft", "open", "closed"];
const APPLICATION_STATUSES = ["pending", "accepted", "rejected", "withdrawn"];
const EXPERIENCE = ["beginner", "experienced"];
const LANGUAGES = ["mn", "en", "zh", "ja", "ko", "ru"];

const DEFAULT_EXPIRE_DAYS = 30;
const MAX_EXPIRE_DAYS = 90;

function isRecruitmentEnabled() {
  const raw = process.env.TEAM_RECRUITMENT_ENABLED;
  if (raw == null || String(raw).trim() === "") return true;
  return !["0", "false", "off", "no"].includes(String(raw).trim().toLowerCase());
}

module.exports = {
  WORK_ROLES,
  COMPENSATION,
  LISTING_STATUSES,
  APPLICATION_STATUSES,
  EXPERIENCE,
  LANGUAGES,
  DEFAULT_EXPIRE_DAYS,
  MAX_EXPIRE_DAYS,
  isRecruitmentEnabled,
};
