// src/utils/cache.js
const store = new Map();

function get(key) {
  const v = store.get(key);
  if (!v) return null;
  if (Date.now() > v.exp) {
    store.delete(key);
    return null;
  }
  return v.data;
}

function set(key, data, ttlMs = 60_000) {
  store.set(key, { data, exp: Date.now() + ttlMs });
}

function del(key) {
  store.delete(key);
}

// prefix-ээр олныг цэвэрлэх (admin/editor list cache invalidate хийхэд)
function delPrefix(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

module.exports = { get, set, del, delPrefix };
