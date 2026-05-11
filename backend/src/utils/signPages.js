// utils/signPages.js
// Chapter pages массивын imageUrl-уудыг signed URL-ээр солино.
// R2 bucket private болсны дараа URL шууд хандах боломжгүй болно —
// энэ функц backend-аас 4 цагийн хугацаатай signed URL үүсгэнэ.

const { signR2Key, urlToR2Key } = require("../config/r2");

/**
 * Pages массивын imageUrl бүрийг signed URL болгоно.
 * R2 URL биш бол (external/legacy) хөндөхгүй.
 * @param {Array} pages  — { imageUrl, pageNumber, ... }[]
 * @param {number} expiresIn — секунд (default 4 цаг)
 */
async function signPages(pages, expiresIn = 4 * 60 * 60) {
  if (!Array.isArray(pages) || pages.length === 0) return pages;

  return Promise.all(
    pages.map(async (page) => {
      const key = urlToR2Key(page.imageUrl);
      if (!key) return page; // R2 биш URL — хөндөхгүй
      try {
        const signedUrl = await signR2Key(key, expiresIn);
        return { ...page, imageUrl: signedUrl };
      } catch {
        return page; // sign хийж чадахгүй бол анхных нь буцаана
      }
    })
  );
}

/**
 * Ганц URL-ийг sign хийнэ (cover image г.м.).
 * R2 URL биш бол анхных нь буцаана.
 */
async function signUrl(url, expiresIn = 4 * 60 * 60) {
  if (!url) return url;
  const key = urlToR2Key(url);
  if (!key) return url;
  try {
    return await signR2Key(key, expiresIn);
  } catch {
    return url;
  }
}

module.exports = { signPages, signUrl };
