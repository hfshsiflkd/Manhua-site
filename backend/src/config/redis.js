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
    maxRetriesPerRequest: 0,   // fail fast — DB fallback тэр даруй
    enableReadyCheck: false,
    lazyConnect: false,        // cold start-д тэр даруй холбогдоно
    connectTimeout: 3000,
    commandTimeout: 1000,      // 1s-д хариу өгөхгүй бол skip
  });

  return redis;
}

module.exports = { getRedisClient };

