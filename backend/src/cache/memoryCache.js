// src/cache/memoryCache.js
class MemoryCache {
  constructor() {
    this.map = new Map(); // key -> { data, exp }
  }

  get(key) {
    const v = this.map.get(key);
    if (!v) return null;
    if (Date.now() > v.exp) {
      this.map.delete(key);
      return null;
    }
    return v.data;
  }

  set(key, data, ttlMs = 60_000) {
    this.map.set(key, { data, exp: Date.now() + ttlMs });
  }

  del(key) {
    this.map.delete(key);
  }

  delByPrefix(prefix) {
    for (const key of this.map.keys()) {
      if (String(key).startsWith(prefix)) this.map.delete(key);
    }
  }
}

module.exports = { MemoryCache };
