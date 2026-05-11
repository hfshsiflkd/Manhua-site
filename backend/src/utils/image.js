const sharp = require("sharp");
const { randomBytes } = require("crypto");

function assertImageFile(file) {
  if (!file || !file.buffer) {
    throw new Error("File missing");
  }
  const type = String(file.mimetype || "");
  if (!type.startsWith("image/")) {
    throw new Error("Invalid image type");
  }
}

async function toWebpBuffer(file) {
  assertImageFile(file);
  // failOn: "none" — corrupted/warning-тэй PNG-уудыг ч уншина
  // limitInputPixels: false — том PNG/чимэг зургийн pixel limit-г тойрно
  // rotate() — EXIF-н дагуу зөв эргүүлнэ
  try {
    const buffer = await sharp(file.buffer, {
      failOn: "none",
      limitInputPixels: false,
    })
      .rotate()
      // nearLossless: манхуа шугам/текст зурагт lossy-тэй ижил хэмжээ, хамаагүй дээр чанар
      .webp({ nearLossless: true, quality: 90, effort: 4 })
      .toBuffer();
    return { buffer, contentType: "image/webp" };
  } catch (err) {
    // Sharp алдааг clone-доод дээш буулгаж тодорхой message өгөх
    const e = new Error(`Image convert failed: ${err.message}`);
    e.cause = err;
    throw e;
  }
}

function makeWebpKey(folder) {
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.webp`;
  return `${folder}/${filename}`;
}

module.exports = {
  toWebpBuffer,
  makeWebpKey,
};
