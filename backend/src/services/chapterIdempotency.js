const redisCache = require("../cache/redisCache");

function idempotencyCacheKey(userId, key) {
  return `chapter:idem:${userId}:${key}`;
}

function isValidIdempotencyKey(key) {
  return typeof key === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(key);
}

async function createChapterOnce({ userId, idempotencyKey, findById, create }) {
  const key = isValidIdempotencyKey(idempotencyKey) ? idempotencyKey : "";
  const cacheKey = key ? idempotencyCacheKey(userId, key) : "";
  if (cacheKey) {
    const existingId = await redisCache.get(cacheKey);
    if (existingId && existingId !== "pending") {
      const existing = await findById(existingId);
      if (existing) return { replayed: true, chapter: existing };
    }
    if (existingId === "pending") {
      const err = new Error("Энэ хүсэлт аль хэдийн боловсруулагдаж байна.");
      err.statusCode = 409;
      throw err;
    }
    await redisCache.set(cacheKey, "pending", 60);
  }

  try {
    const chapter = await create();
    if (cacheKey) {
      await redisCache.set(cacheKey, String(chapter._id), 60 * 60 * 24);
    }
    return { replayed: false, chapter };
  } catch (err) {
    if (cacheKey) await redisCache.del(cacheKey);
    throw err;
  }
}

module.exports = {
  createChapterOnce,
  isValidIdempotencyKey,
};
