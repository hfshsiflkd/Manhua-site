const test = require("node:test");
const assert = require("node:assert/strict");

process.env.UPLOAD_TOKEN_SECRET = "unit-test-upload-secret";

const {
  MiB,
  STRIP_HEIGHT,
  assertDeclaredUpload,
  assertDecodedBounds,
  assertRole,
  assertTokenOwner,
  createUploadToken,
  readUploadToken,
  splitStripPlan,
  ImagePolicyError,
} = require("./imagePolicy");

test("chapter accepts 25MiB and rejects one byte over", () => {
  assertDeclaredUpload({
    purpose: "chapter",
    contentType: "image/png",
    contentLength: 25 * MiB,
  });
  assert.throws(
    () =>
      assertDeclaredUpload({
        purpose: "chapter",
        contentType: "image/jpeg",
        contentLength: 25 * MiB + 1,
      }),
    /хэт том/
  );
});

test("declared type must be a still image mime", () => {
  assert.throws(
    () =>
      assertDeclaredUpload({
        purpose: "chapter",
        contentType: "image/gif",
        contentLength: 1000,
      }),
    /Хөдөлгөөнт/
  );
  assert.throws(
    () =>
      assertDeclaredUpload({
        purpose: "cover",
        contentType: "text/html",
        contentLength: 1000,
      }),
    /PNG, JPEG, WebP/
  );
});

test("regular user cannot upload chapter or cover, can upload request and avatar", () => {
  const user = { _id: "user-1", role: "user" };
  assert.throws(() => assertRole(user, "chapter"), (err) => err.statusCode === 403);
  assert.throws(() => assertRole(user, "cover"), (err) => err.statusCode === 403);
  assert.doesNotThrow(() => assertRole(user, "request"));
  assert.doesNotThrow(() => assertRole(user, "avatar"));
  assert.doesNotThrow(() => assertRole({ _id: "ed-1", role: "editor" }, "chapter"));
  assert.doesNotThrow(() => assertRole({ _id: "tr-1", role: "translator" }, "cover"));
});

test("pixel and dimension bounds reject bombs without decoding", () => {
  assert.throws(
    () => assertDecodedBounds({ format: "png", width: 10000, height: 10000 }, "chapter"),
    /пикселийн/
  );
  assert.throws(
    () => assertDecodedBounds({ format: "png", width: 5000, height: 1000 }, "chapter"),
    /хэт их/
  );
  assert.throws(
    () => assertDecodedBounds({ format: "gif", width: 10, height: 10, pages: 1 }, "chapter"),
    /Хөдөлгөөнт/
  );
  assert.throws(
    () => assertDecodedBounds({ format: "webp", width: 10, height: 10, pages: 4 }, "chapter"),
    /Хөдөлгөөнт/
  );
  const ok = assertDecodedBounds({ format: "png", width: 1200, height: 20000 }, "chapter");
  assert.equal(ok.width, 1200);
  assert.equal(ok.height, 20000);
});

test("strip plan keeps width-oriented slices without overlap or gaps", () => {
  const parts = splitStripPlan(20000, STRIP_HEIGHT);
  assert.deepEqual(
    parts.map((part) => part.height),
    [16000, 4000]
  );
  assert.equal(parts[0].top, 0);
  assert.equal(parts[1].top, 16000);
  const covered = parts.reduce((sum, part) => sum + part.height, 0);
  assert.equal(covered, 20000);
  for (let i = 1; i < parts.length; i += 1) {
    assert.equal(parts[i].top, parts[i - 1].top + parts[i - 1].height);
  }
});

test("upload token is bound to the user and staging key", () => {
  const token = createUploadToken({
    userId: "user-a",
    purpose: "chapter",
    key: "staging/user-a/chapter/file",
    contentType: "image/png",
    contentLength: 10,
    iat: Date.now(),
  });
  const payload = readUploadToken(token);
  assert.equal(payload.userId, "user-a");
  assert.throws(
    () => assertTokenOwner(payload, { _id: "user-b", role: "editor" }),
    (err) => err instanceof ImagePolicyError && err.statusCode === 403
  );
  assert.doesNotThrow(() => assertTokenOwner(payload, { _id: "user-a", role: "editor" }));
  assert.throws(() => readUploadToken(`${token}x`), /token буруу/);
});

test("frontend limits stay aligned with the backend policy", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(
    path.join(__dirname, "../../../frontend/lib/imageLimits.ts"),
    "utf8"
  );
  assert.match(src, /chapter:[\s\S]*?maxBytes: 25 \* MiB/);
  assert.match(src, /cover:[\s\S]*?maxBytes: 8 \* MiB/);
  assert.match(src, /avatar:[\s\S]*?maxBytes: 5 \* MiB/);
  assert.match(src, /request:[\s\S]*?maxBytes: 8 \* MiB/);
  assert.match(src, /feedback:[\s\S]*?maxBytes: 4 \* MiB/);
});
