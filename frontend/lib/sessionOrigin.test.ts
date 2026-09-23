import assert from "node:assert/strict";
import test from "node:test";
import { sameOriginRequest } from "./sessionOrigin.ts";

test("same-origin POST is allowed; cross-site CSRF Origin is rejected", () => {
  const same = new Request("https://www.arc-read.com/api/session", {
    method: "POST",
    headers: { origin: "https://www.arc-read.com", host: "www.arc-read.com", "sec-fetch-site": "same-origin" },
  });
  assert.equal(sameOriginRequest(same), true);

  const csrf = new Request("https://www.arc-read.com/api/session", {
    method: "POST",
    headers: { origin: "https://evil.example", host: "www.arc-read.com", "sec-fetch-site": "cross-site" },
  });
  assert.equal(sameOriginRequest(csrf), false);
});
