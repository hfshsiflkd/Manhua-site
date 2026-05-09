// src/utils/invalidatePublicManhuaCache.js
// Public хэсгийн манхуа холбогдсон бүх Redis cache-ийг арилгана.
// Манхуа soft-delete / restore / permanent-delete бүрд дуудна.
const redisCache = require("../cache/redisCache");

const PREFIXES = [
  "manhua:",          // services/manhuaService.js: manhua:list:*, manhua:slug:*
  "home-sections-",   // controllers/manhuaController.js
  "popular-today-",   // controllers/manhuaController.js
];

async function invalidatePublicManhuaCache() {
  await Promise.all(PREFIXES.map((p) => redisCache.delPrefix(p)));
}

module.exports = { invalidatePublicManhuaCache };
