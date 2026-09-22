const { canonicalizeImageRef } = require("./imageRef");

function formatChapterPage(page, idx) {
  const raw = page?.sourceUrl || page?.imageUrl;
  if (!page || typeof raw !== "string" || !raw.trim()) {
    const err = new Error("Хуудсын зургийн холбоос дутуу байна.");
    err.statusCode = 400;
    throw err;
  }
  const stored = canonicalizeImageRef(raw);
  const formatted = {
    pageNumber: Number.isFinite(Number(page.pageNumber)) ? Number(page.pageNumber) : idx + 1,
    imageUrl: stored.imageUrl,
    originalName: page.originalName || null,
  };
  if (Number.isFinite(Number(page.width)) && Number(page.width) > 0) {
    formatted.width = Number(page.width);
  }
  if (Number.isFinite(Number(page.height)) && Number(page.height) > 0) {
    formatted.height = Number(page.height);
  }
  return formatted;
}

module.exports = { formatChapterPage };
