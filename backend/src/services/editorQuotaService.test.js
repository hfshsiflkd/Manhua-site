"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  partitionAssetUrls,
  normalizeAssetUrl,
  enforceUploadQuotaDecision,
  enforceManhuaQuotaDecision,
} = require("./editorQuotaService");
const { isSelfServeSignupEnabled } = require("../config/selfServeEditor");

test("upload quota: team-only user is capped; self-serve stays capped even as editor on a team; staff skip", () => {
  assert.equal(enforceUploadQuotaDecision({ selfServe: false, role: "user" }), true);
  assert.equal(enforceUploadQuotaDecision({ selfServe: true, role: "editor" }), true);
  assert.equal(enforceUploadQuotaDecision({ selfServe: true, role: "editor" }), true, "self-serve on a team still capped");
  assert.equal(enforceUploadQuotaDecision({ selfServe: false, role: "editor" }), false);
  assert.equal(enforceUploadQuotaDecision({ selfServe: false, role: "translator" }), false);
  assert.equal(enforceUploadQuotaDecision({ selfServe: false, role: "admin" }), false);
});

test("role=editor is not an upload-quota skip without self_serve=false from the profile", () => {
  assert.equal(enforceUploadQuotaDecision({ selfServe: true, role: "editor" }), true);
  assert.equal(enforceUploadQuotaDecision({ role: "editor" }), false);
});

test("manhua/day quota is self-serve only, including after joining a team", () => {
  assert.equal(enforceManhuaQuotaDecision({ selfServe: true }), true);
  assert.equal(enforceManhuaQuotaDecision({ selfServe: false }), false);
  assert.equal(enforceManhuaQuotaDecision({ selfServe: false, role: "editor" }), false);
});

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
