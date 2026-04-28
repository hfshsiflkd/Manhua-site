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
  const buffer = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
  return { buffer, contentType: "image/webp" };
}

function makeWebpKey(folder) {
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.webp`;
  return `${folder}/${filename}`;
}

module.exports = {
  toWebpBuffer,
  makeWebpKey,
};
