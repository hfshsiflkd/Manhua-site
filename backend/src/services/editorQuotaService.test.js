"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { partitionAssetUrls, normalizeAssetUrl } = require("./editorQuotaService");
const { isSelfServeSignupEnabled } = require("../config/selfServeEditor");

test("legacy attached URLs do not need published_uploads provenance", () => {
  const legacy = "https://cdn.example.com/old-cover.webp";
  const part = partitionAssetUrls([legacy], { existingUrls: [legacy] });
  assert.deepEqual(part.needsProvenance, []);
  assert.deepEqual(part.alreadyAttached, [legacy]);
});

test("new URLs are not treated as legacy just because they look like CDN links", () => {
  const part = partitionAssetUrls(["https://cdn.example.com/random.webp"], {
    existingUrls: ["https://cdn.example.com/old-cover.webp"],
  });
  assert.deepEqual(part.needsProvenance, ["https://cdn.example.com/random.webp"]);
});

test("signed R2 query strings canonicalize to the public object URL", () => {
  process.env.R2_PUBLIC_BASE_URL = "https://cdn.test";
  const signed =
    "https://bucket.account.r2.cloudflarestorage.com/manhua_pages/page.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc";
  assert.equal(normalizeAssetUrl(signed), "https://cdn.test/manhua_pages/page.webp");
});

test("signup flag defaults on and honors false", () => {
  const prev = process.env.SELF_SERVE_EDITOR_SIGNUP;
  delete process.env.SELF_SERVE_EDITOR_SIGNUP;
  assert.equal(isSelfServeSignupEnabled(), true);
  process.env.SELF_SERVE_EDITOR_SIGNUP = "false";
  assert.equal(isSelfServeSignupEnabled(), false);
  process.env.SELF_SERVE_EDITOR_SIGNUP = "true";
  assert.equal(isSelfServeSignupEnabled(), true);
  if (prev == null) delete process.env.SELF_SERVE_EDITOR_SIGNUP;
  else process.env.SELF_SERVE_EDITOR_SIGNUP = prev;
});
