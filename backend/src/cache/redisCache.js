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
    } catch {
      // Redis алдаа — fallback ашиглана
    }
  }
  return fallback.get(key);
}

async function set(key, data, ttlSec = 60) {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttlSec);
    } catch {
      // Redis алдаа — fallback ашиглана
    }
  }
  fallback.set(key, data, ttlSec * 1000);
}

async function del(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // Redis алдаа — fallback ашиглана
    }
  }
  fallback.del(key);
}

// 🧹 Prefix-ээр олон key цэвэрлэх — SCAN ашиглана (KEYS блоклодог).
async function delPrefix(prefix) {
  const redis = getRedisClient();
  if (redis) {
    try {
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          100
        );
        cursor = next;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch {
      // Redis алдаа — fallback ашиглана
    }
  }
  if (typeof fallback.delByPrefix === "function") {
    fallback.delByPrefix(prefix);
  }
}

module.exports = { get, set, del, delPrefix };
