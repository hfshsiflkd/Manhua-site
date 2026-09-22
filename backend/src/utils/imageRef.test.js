const test = require("node:test");
const assert = require("node:assert/strict");

process.env.R2_PUBLIC_BASE_URL = "https://cdn.test";
process.env.R2_BUCKET_NAME = "test-bucket";

const {
  canonicalizeImageRef,
  classifyImageRef,
  isSignedUrlExpired,
} = require("./imageRef");

test("signed R2 URL is stored as a stable public URL", () => {
  const signed =
    "https://test-bucket.example.r2.cloudflarestorage.com/test-bucket/manhua_pages/page.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20200101T000000Z&X-Amz-Expires=60&X-Amz-Signature=dead";
  const now = Date.parse("2026-09-22T00:00:00Z");
  assert.equal(isSignedUrlExpired(signed, now), true);
  const stored = canonicalizeImageRef(signed);
  assert.equal(stored.imageUrl, "https://cdn.test/manhua_pages/page.png");
  assert.equal(stored.imageUrl.includes("X-Amz-"), false);
});

test("public URL query is stripped and Cloudinary stays", () => {
  const publicUrl = canonicalizeImageRef("https://cdn.test/manhua_pages/a.webp?download=1");
  assert.equal(publicUrl.imageUrl, "https://cdn.test/manhua_pages/a.webp");
  const cloud = canonicalizeImageRef("https://res.cloudinary.com/demo/image/upload/v1/page.jpg");
  assert.equal(cloud.kind, "cloudinary");
});

test("foreign signed URL is not rewritten", () => {
  const found = classifyImageRef(
    "https://evil.example/manhua_pages/a.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc"
  );
  assert.equal(found.action, "uncertain");
  assert.throws(() => canonicalizeImageRef(found.value), /танигдаагүй/);
});
