const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

process.env.UPLOAD_TOKEN_SECRET = "unit-test-upload-secret";
process.env.R2_PUBLIC_BASE_URL = "https://cdn.test";

const { createImageUploadService } = require("./imageUploadService");
const { createUploadToken } = require("../utils/imagePolicy");

function memoryStorage() {
  const objects = new Map();
  return {
    objects,
    async signPut({ key, contentLength }) {
      objects.set(key, { pending: true, contentLength });
      return `https://storage.test/${key}?X-Amz-SignedHeaders=content-length%3Bhost`;
    },
    async head(key) {
      const obj = objects.get(key);
      if (!obj || !obj.body) {
        const err = new Error("missing");
        err.name = "NotFound";
        throw err;
      }
      return { ContentLength: obj.body.length };
    },
    async getBuffer(key) {
      return objects.get(key).body;
    },
    async put(key, body, contentType) {
      objects.set(key, { body, contentType });
    },
    async remove(key) {
      objects.delete(key);
    },
  };
}

test("presign does not accept a chapter upload from a regular user", async () => {
  const storage = memoryStorage();
  const service = createImageUploadService({ storage });
  await assert.rejects(
    () =>
      service.presign({
        user: { _id: "user-1", role: "user" },
        purpose: "chapter",
        contentType: "image/png",
        contentLength: 1000,
        fileName: "page.png",
      }),
    (err) => err.statusCode === 403
  );
  assert.equal(storage.objects.size, 0);
});

test("request presign is allowed for a logged-in user and stays in that user's prefix", async () => {
  const storage = memoryStorage();
  const service = createImageUploadService({ storage });
  const signed = await service.presign({
    user: { _id: "user-1", role: "user" },
    purpose: "request",
    contentType: "image/png",
    contentLength: 2048,
    fileName: "ref.png",
  });
  assert.match(signed.uploadUrl, /^https:\/\/storage\.test\/staging\/user-1\/request\//);
  assert.ok(signed.token);
  assert.equal(signed.headers["Content-Type"], undefined);
});

test("finalize validates bytes and blocks another user's token", async () => {
  const storage = memoryStorage();
  const saved = [];
  const service = createImageUploadService({
    storage,
    saveAvatar: async (user, url) => saved.push({ user, url }),
  });
  const png = await sharp({
    create: { width: 12, height: 20, channels: 3, background: { r: 9, g: 8, b: 7 } },
  })
    .png()
    .toBuffer();

  const editor = { _id: "editor-1", role: "editor" };
  const signed = await service.presign({
    user: editor,
    purpose: "chapter",
    contentType: "image/png",
    contentLength: png.length,
    fileName: "page.png",
  });
  const key = signed.uploadUrl.slice("https://storage.test/".length).split("?")[0];
  storage.objects.set(key, { body: png });

  await assert.rejects(
    () => service.finalize({ user: { _id: "editor-2", role: "editor" }, token: signed.token }),
    (err) => err.statusCode === 403
  );
  assert.ok(storage.objects.has(key));

  const result = await service.finalize({ user: editor, token: signed.token });
  assert.equal(result.width, 12);
  assert.equal(result.height, 20);
  assert.equal(result.urls.length, 1);
  assert.match(result.url, /^https:\/\/cdn\.test\/manhua_pages\//);
  assert.equal(storage.objects.has(key), false);
  const finalKey = result.url.replace("https://cdn.test/", "");
  assert.equal(storage.objects.get(finalKey).contentType, "image/png");
  assert.equal(saved.length, 0);
});

test("finalize rejects a body larger than declared and does not publish", async () => {
  const storage = memoryStorage();
  const service = createImageUploadService({ storage });
  const token = createUploadToken({
    userId: "editor-1",
    purpose: "chapter",
    key: "staging/editor-1/chapter/oversize",
    contentType: "image/png",
    contentLength: 100,
    iat: Date.now(),
  });
  storage.objects.set("staging/editor-1/chapter/oversize", {
    body: Buffer.alloc(250),
  });
  await assert.rejects(
    () => service.finalize({ user: { _id: "editor-1", role: "editor" }, token }),
    /зарласнаас их/
  );
  assert.equal(storage.objects.has("staging/editor-1/chapter/oversize"), false);
  assert.equal([...storage.objects.keys()].some((key) => key.startsWith("manhua_pages/")), false);
});

test("finalize rejects a non-image payload after upload", async () => {
  const storage = memoryStorage();
  const service = createImageUploadService({ storage });
  const body = Buffer.from("<html>fake</html>");
  const token = createUploadToken({
    userId: "editor-1",
    purpose: "chapter",
    key: "staging/editor-1/chapter/fake",
    contentType: "image/png",
    contentLength: body.length,
    iat: Date.now(),
  });
  storage.objects.set("staging/editor-1/chapter/fake", { body });
  await assert.rejects(
    () => service.finalize({ user: { _id: "editor-1", role: "editor" }, token }),
    /гэмтсэн|дэмжигдэхгүй/
  );
  assert.equal(storage.objects.has("staging/editor-1/chapter/fake"), false);
});

test("avatar finalize stores a fitted image and records the profile url", async () => {
  const storage = memoryStorage();
  const saved = [];
  const service = createImageUploadService({
    storage,
    saveAvatar: async (user, url) => saved.push({ id: String(user._id), url }),
  });
  const jpeg = await sharp({
    create: { width: 800, height: 800, channels: 3, background: { r: 3, g: 4, b: 5 } },
  })
    .jpeg()
    .toBuffer();
  const user = { _id: "user-9", role: "user" };
  const signed = await service.presign({
    user,
    purpose: "avatar",
    contentType: "image/jpeg",
    contentLength: jpeg.length,
    fileName: "me.jpg",
  });
  const key = signed.uploadUrl.slice("https://storage.test/".length).split("?")[0];
  storage.objects.set(key, { body: jpeg });
  const result = await service.finalize({ user, token: signed.token });
  assert.ok(result.width <= 512 && result.height <= 512);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].url, result.url);
  assert.match(result.url, /\/avatars\//);
});
