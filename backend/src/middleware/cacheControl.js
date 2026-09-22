// src/middleware/cacheControl.js
//
// Chapter JSON өмнө нь s-maxage=300, stale-while-revalidate=30 байсан.
// Cloudflare тэр хариуг 330 секунд хүртэл хадгална. Purge token байхгүй
// үед аль хэдийн хадгалсан объектыг origin header өөрчилснөөр устгаж болохгүй.
// Тиймээс шинэ хариуг shared cache-д огт үлдээхгүй.

const LEGACY_SHARED_MAX_AGE_SEC = 300;
const LEGACY_SWR_SEC = 30;

function legacySharedCacheResidualMs(cachedAt, now = Date.now()) {
  const expiresAt = Number(cachedAt) + (LEGACY_SHARED_MAX_AGE_SEC + LEGACY_SWR_SEC) * 1000;
  return Math.max(0, expiresAt - now);
}

function applyNoStore(res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

function publicCache(seconds = 60) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();

    const hasAuth = !!req.headers.authorization;
    const hasCookie = !!req.headers.cookie;
    if (hasAuth || hasCookie) {
      applyNoStore(res);
      return next();
    }

    res.setHeader(
      "Cache-Control",
      `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=30`
    );
    next();
  };
}

function doNotStoreShared(_req, res, next) {
  applyNoStore(res);
  next();
}

module.exports = {
  publicCache,
  doNotStoreShared,
  legacySharedCacheResidualMs,
  LEGACY_SHARED_MAX_AGE_SEC,
  LEGACY_SWR_SEC,
};
