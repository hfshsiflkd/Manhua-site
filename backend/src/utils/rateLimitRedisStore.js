/**
 * Minimal Redis store for express-rate-limit (no extra dependency).
 * Works across multiple app instances.
 *
 * Notes:
 * - Uses INCR + PTTL and sets EXPIRE on first hit.
 * - Reset time is derived from key TTL.
 */

function createRedisRateLimitStore({ client, prefix = "rl:" } = {}) {
  if (!client) return null;

  let windowMsLocal = 0;

  return {
    init: (options) => {
      windowMsLocal = Number(options?.windowMs || 0);
    },

    /**
     * @param {string} key
     * @returns {Promise<{ totalHits: number, resetTime: Date }>}
     */
    increment: async (key) => {
      const redisKey = `${prefix}${key}`;

      // INCR, then get TTL; if first hit, set EXPIRE.
      const multi = client.multi();
      multi.incr(redisKey);
      multi.pttl(redisKey);
      const res = await multi.exec();

      const totalHits = Number(res?.[0]?.[1] || 0);
      let ttlMs = Number(res?.[1]?.[1] || -1);

      // If key has no expiry yet (ttl -1), set expiry based on windowMs
      if (ttlMs === -1) {
        if (windowMsLocal > 0) {
          await client.pexpire(redisKey, windowMsLocal);
          ttlMs = windowMsLocal;
        }
      }

      const resetTime = ttlMs > 0 ? new Date(Date.now() + ttlMs) : new Date(Date.now());
      return { totalHits, resetTime };
    },

    /**
     * @param {string} key
     */
    decrement: async (key) => {
      const redisKey = `${prefix}${key}`;
      // Best-effort; avoid negatives by deleting on <= 0
      try {
        const n = await client.decr(redisKey);
        if (Number(n) <= 0) await client.del(redisKey);
      } catch {
        // ignore
      }
    },

    /**
     * @param {string} key
     */
    resetKey: async (key) => {
      const redisKey = `${prefix}${key}`;
      try {
        await client.del(redisKey);
      } catch {
        // ignore
      }
    },
  };
}

module.exports = { createRedisRateLimitStore };

