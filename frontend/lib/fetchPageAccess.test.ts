import assert from "node:assert/strict";
import test from "node:test";
import { pageAccessUrl } from "./fetchPageAccess.ts";

test("page-access URL uses NEXT_PUBLIC_API_BASE_URL /api prefix", () => {
  assert.equal(
    pageAccessUrl("https://api.arc-read.com/api"),
    "https://api.arc-read.com/api/auth/page-access"
  );
  assert.equal(
    pageAccessUrl("https://api.arc-read.com/api/"),
    "https://api.arc-read.com/api/auth/page-access"
  );
});

test("origin-only API_INTERNAL_URL still hits /api/auth/page-access", () => {
  assert.equal(
    pageAccessUrl("https://api.arc-read.com"),
    "https://api.arc-read.com/api/auth/page-access"
  );
  assert.equal(pageAccessUrl(""), null);
  assert.equal(pageAccessUrl("   "), null);
});
