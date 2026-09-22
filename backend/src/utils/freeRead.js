const AppSetting = require("../models/AppSetting");
const redisCache = require("../cache/redisCache");

const FREE_READ_CACHE_KEY = "setting:freeReadMode";

function resolveFreeRead(cached, now = Date.now()) {
  if (!cached || typeof cached !== "object" || Array.isArray(cached)) return null;
  if (cached.expiresAt && new Date(cached.expiresAt).getTime() <= now) return false;
  return Boolean(cached.active);
}

async function isFreeReadActive(now = Date.now()) {
  const cached = resolveFreeRead(await redisCache.get(FREE_READ_CACHE_KEY), now);
  if (cached !== null) return cached;

  const doc = await AppSetting.findOne({ key: "freeReadMode" });
  const setting = doc?.value || { enabled: false, expiresAt: null };
  const expiresAt = setting.expiresAt ? new Date(setting.expiresAt).getTime() : null;
  const active = Boolean(setting.enabled) && (!expiresAt || expiresAt > now);
  let ttl = 30;
  if (active && expiresAt) {
    ttl = Math.max(1, Math.min(30, Math.floor((expiresAt - now) / 1000)));
  }
  await redisCache
    .set(FREE_READ_CACHE_KEY, { active, expiresAt: setting.expiresAt || null }, ttl)
    .catch(() => {});
  return active;
}

module.exports = {
  FREE_READ_CACHE_KEY,
  resolveFreeRead,
  isFreeReadActive,
};
