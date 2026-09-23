import assert from "node:assert/strict";
import test from "node:test";
import { INTERNAL_PATH_HEADER, trustedProxyHeaders } from "./proxyHeaders.ts";

test("proxy overwrites spoofed x-arc-pathname and strips other x-arc headers", () => {
  const incoming = new Headers({
    "x-arc-pathname": "/editor",
    "x-arc-pages": "admin,editor",
    cookie: "arc_session=forged",
  });
  const headers = trustedProxyHeaders(incoming, "/editor/teams/new");
  assert.equal(headers.get(INTERNAL_PATH_HEADER), "/editor/teams/new");
  assert.equal(headers.get("x-arc-pages"), null);
  assert.equal(headers.get("cookie"), "arc_session=forged");
});
