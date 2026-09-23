import assert from "node:assert/strict";
import test from "node:test";
import { CANONICAL_SITE_ORIGIN, canonicalSiteOrigin, creatorPublicUrl } from "./site.ts";

test("canonical creator URL never uses localhost", () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3018";
  try {
    assert.equal(canonicalSiteOrigin(), CANONICAL_SITE_ORIGIN);
    assert.equal(creatorPublicUrl("abc"), "https://www.arc-read.com/creators/abc");
  } finally {
    if (prev == null) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  }
});
