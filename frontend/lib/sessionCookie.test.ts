import assert from "node:assert/strict";
import test from "node:test";
import { sealSession, unsealSession, sessionCookieOptions, requestIsHttps, jwtRemainingTtlSec, sessionMaxAgeSec, SESSION_MAX_AGE_SEC, SESSION_COOKIE_NAME } from "./sessionCookie.ts";

const SECRET = "test-session-bridge-secret-32chars!!";

test("session cookie encrypts JWT/device credentials; HMAC-only is not encryption", async () => {
  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
  const sealed = await sealSession({ token: jwt, deviceId: "dev-1" }, SECRET);
  assert.ok(sealed);
  assert.equal(sealed.startsWith("v2."), true);
  assert.equal(sealed.includes(jwt), false);
  assert.equal(sealed.includes("dev-1"), false);
  assert.equal(sealed.includes("admin"), false);
  const opened = await unsealSession(sealed!, SECRET);
  assert.deepEqual(opened, { token: jwt, deviceId: "dev-1" });
});

test("forged or wrong-key cookie is rejected", async () => {
  const sealed = await sealSession({ token: "jwt-token", deviceId: "dev-1" }, SECRET);
  assert.ok(sealed);
  const parts = sealed.split(".");
  const iv = Buffer.from(parts[1], "base64url");
  iv[0] ^= 0xff;
  const ivTampered = `v2.${iv.toString("base64url")}.${parts[2]}`;
  assert.equal(await unsealSession(ivTampered, SECRET), null);
  assert.equal(await unsealSession(sealed, "other-secret-other-secret-other"), null);
  assert.equal(await unsealSession("v2.not-json.00", SECRET), null);
});

test("legacy HMAC v1 cookies still unseal so local test sessions can migrate", async () => {
  const body = Buffer.from(JSON.stringify({ v: 1, token: "old-jwt", deviceId: "d0" })).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sig = Array.from(new Uint8Array(sigBuf), (b) => b.toString(16).padStart(2, "0")).join("");
  const opened = await unsealSession(`v1.${body}.${sig}`, SECRET);
  assert.deepEqual(opened, { token: "old-jwt", deviceId: "d0" });
});

test("AES-GCM uses a random IV and rejects missing secret, wrong key, and tampered tag", async () => {
  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
  const a = await sealSession({ token: jwt, deviceId: "dev-1" }, SECRET);
  const b = await sealSession({ token: jwt, deviceId: "dev-1" }, SECRET);
  assert.ok(a && b);
  assert.notEqual(a, b);
  const ivA = a.split(".")[1];
  const ivB = b.split(".")[1];
  assert.notEqual(ivA, ivB);
  assert.equal(await unsealSession(a, ""), null);
  assert.equal(await unsealSession(a, "wrong-secret-wrong-secret-wrong"), null);

  const parts = a.split(".");
  const cipher = Buffer.from(parts[2], "base64url");
  assert.ok(cipher.length > 16);
  cipher[cipher.length - 1] ^= 0xff;
  const tagTampered = `v2.${parts[1]}.${cipher.toString("base64url")}`;
  assert.equal(await unsealSession(tagTampered, SECRET), null);

  const truncated = `v2.${parts[1]}.${Buffer.from(parts[2], "base64url").subarray(0, -16).toString("base64url")}`;
  assert.equal(await unsealSession(truncated, SECRET), null);
});

test("cookie Max-Age follows remaining JWT exp and never exceeds 30d", () => {
  const now = 1_700_000_000_000;
  const expSoon = Math.floor(now / 1000) + 3600;
  const token = `hdr.${Buffer.from(JSON.stringify({ exp: expSoon })).toString("base64url")}.sig`;
  assert.equal(jwtRemainingTtlSec(token, now), 3600);
  assert.equal(sessionMaxAgeSec(token, now), 3600);
  const opts = sessionCookieOptions(true, sessionMaxAgeSec(token, now));
  assert.equal(opts.maxAge, 3600);

  const expFar = Math.floor(now / 1000) + SESSION_MAX_AGE_SEC + 86400;
  const longToken = `hdr.${Buffer.from(JSON.stringify({ exp: expFar })).toString("base64url")}.sig`;
  assert.equal(sessionMaxAgeSec(longToken, now), SESSION_MAX_AGE_SEC);

  const expired = `hdr.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) - 10 })).toString("base64url")}.sig`;
  assert.equal(sessionMaxAgeSec(expired, now), 0);
});

test("production cookie flags are HttpOnly, Path=/, SameSite=Lax", () => {
  const opts = sessionCookieOptions(true);
  assert.equal(SESSION_COOKIE_NAME, "arc_session");
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.secure, true);
  assert.equal(opts.sameSite, "lax");
  assert.equal(opts.path, "/");
  assert.equal(opts.maxAge, SESSION_MAX_AGE_SEC);
  assert.ok(opts.expires instanceof Date);
});

test("Secure cookie follows HTTPS / x-forwarded-proto, not NODE_ENV alone", () => {
  const httpsReq = new Request("https://www.arc-read.com/api/session");
  const httpReq = new Request("http://localhost:3000/api/session");
  const forwarded = new Request("http://localhost/api/session", {
    headers: { "x-forwarded-proto": "https" },
  });
  assert.equal(requestIsHttps(httpsReq), true);
  assert.equal(requestIsHttps(httpReq), false);
  assert.equal(requestIsHttps(forwarded), true);
  assert.equal(sessionCookieOptions(false).secure, false);
});
