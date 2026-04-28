// src/cache/redisCache.js
// Redis-first cache with in-memory fallback.
// Serverless дээр бүх instance нийтлэг Redis cache ашиглана.
// Redis унтарсан үед in-memory-д fallback хийнэ (гацахгүй).
const { getRedisClient } = require("../config/redis");
const { MemoryCache } = require("./memoryCache");

const fallback = new MemoryCache();

async function get(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn("[redisCache] get failed, using fallback:", err.message);
    }
  }
  return fallback.get(key);
}

async function set(key, data, ttlSec = 60) {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttlSec);
    } catch (err) {
      console.warn("[redisCache] set failed, using fallback:", err.message);
    }
  }
  fallback.set(key, data, ttlSec * 1000);
}

async function del(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn("[redisCache] del failed:", err.message);
    }
  }
  fallback.del(key);
}

module.exports = { get, set, del };
