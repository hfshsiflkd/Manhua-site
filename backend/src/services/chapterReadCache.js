const redisCache = require("../cache/redisCache");

const PREFIX = "chapter:public:";

function publicChapterKey(manhuaId, chapterNumber, tier) {
  return `${PREFIX}${manhuaId}:ch:${Number(chapterNumber)}:tier:${tier}`;
}

async function getPublicChapter(manhuaId, chapterNumber, tier) {
  return redisCache.get(publicChapterKey(manhuaId, chapterNumber, tier));
}

async function setPublicChapter(manhuaId, chapterNumber, tier, payload, ttlSec = 60) {
  await redisCache.set(publicChapterKey(manhuaId, chapterNumber, tier), payload, ttlSec);
}

async function invalidateManhuaChapterReads(manhuaId) {
  if (!manhuaId) return;
  await redisCache.delPrefix(`${PREFIX}${manhuaId}:`);
}

module.exports = {
  PREFIX,
  publicChapterKey,
  getPublicChapter,
  setPublicChapter,
  invalidateManhuaChapterReads,
};
