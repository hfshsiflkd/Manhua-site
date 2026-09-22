const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const express = require("express");
const {
  doNotStoreShared,
  legacySharedCacheResidualMs,
  LEGACY_SHARED_MAX_AGE_SEC,
  LEGACY_SWR_SEC,
} = require("./cacheControl");

test("chapter routes do not opt into the old 300 second shared cache", () => {
  const src = fs.readFileSync(path.join(__dirname, "../routes/manhua.routes.js"), "utf8");
  assert.equal(src.includes("publicCache(300)"), false);
  assert.equal(src.includes("doNotStoreShared"), true);
});

test("chapter JSON tells Cloudflare not to store the response", async () => {
  const app = express();
  app.get("/manhuas/demo/chapters/1", doNotStoreShared, (_req, res) => {
    res.json({ pages: [{ imageUrl: "https://cdn.test/page.png" }] });
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/manhuas/demo/chapters/1`);
    const cacheControl = res.headers.get("cache-control") || "";
    assert.match(cacheControl, /no-store/);
    assert.equal(cacheControl.includes("s-maxage"), false);
    assert.equal(res.headers.get("cdn-cache-control"), "no-store");
    assert.equal(res.headers.get("cloudflare-cdn-cache-control"), "no-store");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("a response already stored with s-maxage=300 can remain until that TTL ends", () => {
  const cachedAt = Date.parse("2026-09-22T12:00:00Z");
  const during = cachedAt + 60_000;
  const after = cachedAt + (LEGACY_SHARED_MAX_AGE_SEC + LEGACY_SWR_SEC) * 1000 + 1;
  assert.equal(legacySharedCacheResidualMs(cachedAt, during), 270_000);
  assert.equal(legacySharedCacheResidualMs(cachedAt, after), 0);
});
