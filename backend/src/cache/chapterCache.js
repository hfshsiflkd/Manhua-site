// src/cache/chapterCache.js
const { MemoryCache } = require("./memoryCache");
const chapterCache = new MemoryCache();

function makeChapterKey({
  manhuaId,
  chapterNumber,
  language = "mn",
  status = "published",
}) {
  return `${manhuaId}:${chapterNumber}:${language}:${status}`;
}

module.exports = { chapterCache, makeChapterKey };
