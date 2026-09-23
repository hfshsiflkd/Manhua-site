"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canonicalSiteOrigin, publicUrlFor } = require("./creatorProfileService");

test("canonical site origin never uses localhost", () => {
  const prev = process.env.PUBLIC_SITE_URL;
  process.env.PUBLIC_SITE_URL = "http://localhost:3018";
  try {
    assert.equal(canonicalSiteOrigin(), "https://www.arc-read.com");
    assert.match(publicUrlFor("abc"), /^https:\/\/www\.arc-read\.com\/creators\/abc$/);
  } finally {
    if (prev == null) delete process.env.PUBLIC_SITE_URL;
    else process.env.PUBLIC_SITE_URL = prev;
  }
});
