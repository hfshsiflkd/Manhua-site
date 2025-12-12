// src/middleware/cacheControl.js
function publicCache(seconds = 60) {
  return (req, res, next) => {
    // зөвхөн GET
    if (req.method !== "GET") return next();

    // Auth/cookie байвал cache хийхгүй (аюулгүй тал)
    const hasAuth = !!req.headers.authorization;
    const hasCookie = !!req.headers.cookie;
    if (hasAuth || hasCookie) {
      res.setHeader("Cache-Control", "private, no-store");
      return next();
    }

    // Cloudflare зэрэг CDN-д хадгалуулах
    res.setHeader(
      "Cache-Control",
      `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=30`
    );
    next();
  };
}

module.exports = { publicCache };
