const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { processImage, encodeLosslessParts } = require("./image");
const { MiB } = require("./imagePolicy");

const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

async function pixel(buffer, x, y) {
  const { data, info } = await sharp(buffer)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { rgba: [...data], info };
}

test("corrupt and fake files return a Mongolian error", async () => {
  await assert.rejects(
    () => processImage(Buffer.from("<html>not an image</html>"), "chapter"),
    /гэмтсэн|дэмжигдэхгүй/
  );
  await assert.rejects(
    () => processImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0]), "chapter"),
    /гэмтсэн|дэмжигдэхгүй/
  );
  await assert.rejects(() => processImage(GIF, "chapter"), /Хөдөлгөөнт/);
});

test("byte ceiling rejects a buffer over 25MiB before decode", async () => {
  const tooBig = Buffer.alloc(25 * MiB + 1);
  await assert.rejects(() => processImage(tooBig, "chapter"), /хэт том/);
});

test("small chapter image is stored without recompression", async () => {
  const input = await sharp({
    create: { width: 32, height: 48, channels: 3, background: { r: 20, g: 40, b: 60 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  const result = await processImage(input, "chapter");
  assert.equal(result.width, 32);
  assert.equal(result.height, 48);
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].storage, "original");
  assert.equal(result.parts[0].contentType, "image/jpeg");
  assert.ok(result.parts[0].buffer.equals(input));
});

test("transparent PNG keeps alpha bytes for chapter and alpha for cover", async () => {
  const input = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.4 },
    },
  })
    .png()
    .toBuffer();
  const chapter = await processImage(input, "chapter");
  assert.equal(chapter.parts[0].storage, "original");
  assert.ok(chapter.parts[0].buffer.equals(input));

  const cover = await processImage(input, "cover");
  assert.equal(cover.parts[0].contentType, "image/webp");
  assert.ok(cover.width <= 1600 && cover.height <= 2400);
  const sample = await pixel(cover.parts[0].buffer, 0, 0);
  assert.ok(sample.rgba[3] < 255, `alpha was flattened: ${sample.rgba.join(",")}`);
});

test("EXIF orientation is applied before chapter storage", async () => {
  const jpeg = await sharp({
    create: { width: 40, height: 10, channels: 3, background: { r: 0, g: 180, b: 0 } },
  })
    .jpeg()
    .toBuffer();
  const oriented = await sharp(jpeg).withMetadata({ orientation: 6 }).toBuffer();
  const result = await processImage(oriented, "chapter");
  assert.equal(result.width, 10);
  assert.equal(result.height, 40);
  assert.notEqual(result.parts[0].storage, "original");
  const meta = await sharp(result.parts[0].buffer).metadata();
  assert.equal(meta.width, 10);
  assert.equal(meta.height, 40);
});

test("1200x20000 chapter page keeps width and a 1:1 crop", { timeout: 120000 }, async () => {
  const marker = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
  const input = await sharp({
    create: {
      width: 1200,
      height: 20000,
      channels: 3,
      background: { r: 250, g: 250, b: 250 },
    },
  })
    .composite([{ input: marker, left: 10, top: 100 }])
    .png()
    .toBuffer();

  const result = await processImage(input, "chapter");
  assert.equal(result.width, 1200);
  assert.equal(result.height, 20000);
  assert.notEqual(result.width, 144);
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].storage, "original");
  assert.ok(result.parts[0].buffer.equals(input));

  const crop = await pixel(result.parts[0].buffer, 10, 100);
  assert.equal(crop.rgba[0], 255);
  assert.equal(crop.rgba[1], 0);
  assert.equal(crop.rgba[2], 0);
});

test("images taller than the WebP limit split without overlap and keep width", { timeout: 120000 }, async () => {
  const marker = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 0, b: 255 } },
  })
    .png()
    .toBuffer();
  const input = await sharp({
    create: {
      width: 80,
      height: 16400,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .composite([{ input: marker, left: 4, top: 16390 }])
    .png()
    .toBuffer();

  const encoded = await encodeLosslessParts(input, 50_000_000);
  assert.equal(encoded.width, 80);
  assert.equal(encoded.height, 16400);
  assert.equal(encoded.parts.length, 2);
  assert.equal(encoded.parts[0].width, 80);
  assert.equal(encoded.parts[0].height, 16000);
  assert.equal(encoded.parts[1].width, 80);
  assert.equal(encoded.parts[1].height, 400);
  assert.equal(
    encoded.parts.reduce((sum, part) => sum + part.height, 0),
    16400
  );

  const top = await pixel(encoded.parts[0].buffer, 0, 0);
  assert.deepEqual(top.rgba.slice(0, 3), [10, 20, 30]);
  const mark = await pixel(encoded.parts[1].buffer, 4, 390);
  assert.deepEqual(mark.rgba.slice(0, 3), [0, 0, 255]);
});

test("chapter file over 4MiB is not resized", { timeout: 120000 }, async () => {
  const input = await sharp({
    create: {
      width: 2400,
      height: 2400,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 128, sigma: 50 },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer();
  assert.ok(input.length > 4 * MiB, `fixture was only ${input.length} bytes`);
  const result = await processImage(input, "chapter");
  assert.equal(result.width, 2400);
  assert.equal(result.height, 2400);
  assert.equal(result.parts[0].storage, "original");
  assert.ok(result.parts[0].buffer.equals(input));
});

test("20–25MiB chapter JPEG keeps its pixels and is not recompressed", { timeout: 120000 }, async () => {
  const input = await sharp({
    create: {
      width: 4096,
      height: 4096,
      channels: 3,
      background: { r: 100, g: 140, b: 180 },
      noise: { type: "gaussian", mean: 128, sigma: 80 },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer();
  assert.ok(input.length > 20 * MiB && input.length <= 25 * MiB, `fixture was ${input.length} bytes`);
  const result = await processImage(input, "chapter");
  assert.equal(result.width, 4096);
  assert.equal(result.height, 4096);
  assert.equal(result.parts[0].storage, "original");
  assert.ok(result.parts[0].buffer.equals(input));
});

test("avatar fit stays inside 512px and does not use chapter passthrough", async () => {
  const input = await sharp({
    create: { width: 1000, height: 400, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .jpeg()
    .toBuffer();
  const result = await processImage(input, "avatar");
  assert.ok(result.width <= 512);
  assert.ok(result.height <= 512);
  assert.ok(Math.abs(result.width / result.height - 2.5) < 0.05);
  assert.equal(result.parts[0].storage, "fit-webp");
});

test("EXIF chapter taller than WebP max is split without changing width", { timeout: 120000 }, async () => {
  const wide = await sharp({
    create: {
      width: 16400,
      height: 80,
      channels: 3,
      background: { r: 1, g: 2, b: 3 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  const oriented = await sharp(wide).withMetadata({ orientation: 6 }).toBuffer();
  const result = await processImage(oriented, "chapter");
  assert.equal(result.width, 80);
  assert.equal(result.height, 16400);
  assert.equal(result.parts.length, 2);
  assert.equal(result.parts[0].width, 80);
  assert.equal(result.parts[0].height, 16000);
  assert.equal(result.parts[1].width, 80);
  assert.equal(result.parts[1].height, 400);
  assert.equal(result.parts[0].storage, "lossless-webp-strip");
});
