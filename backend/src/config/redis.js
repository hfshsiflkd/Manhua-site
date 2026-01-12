const Redis = require("ioredis");

let redis = null;

function buildRedisUrlFromParts() {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  if (!host || !port) return null;
  return `redis://${host}:${port}`;
}

function getRedisClient() {
  if (redis) return redis;

  const url = process.env.REDIS_URL || buildRedisUrlFromParts();
  if (!url) return null;

  redis = new Redis(url, {
    // Keep default retry strategy; callers should handle null client if not configured
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  // Best-effort connect; don't crash the app if Redis is down.
  redis.connect().catch(() => {});

  return redis;
}

module.exports = { getRedisClient };

