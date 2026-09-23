import assert from "node:assert/strict";
import test from "node:test";
import { sealSession, unsealSession } from "./sessionCookie.ts";

const SECRET = "test-session-bridge-secret-32chars!!";

test("session cookie is HMAC sealed and does not trust a role field", async () => {
  const sealed = await sealSession({ token: "jwt-token", deviceId: "dev-1" }, SECRET);
  assert.ok(sealed);
  assert.equal(sealed.includes("admin"), false);
  const opened = await unsealSession(sealed!, SECRET);
  assert.deepEqual(opened, { token: "jwt-token", deviceId: "dev-1" });
});

test("forged cookie HMAC is rejected", async () => {
  const sealed = await sealSession({ token: "jwt-token", deviceId: "dev-1" }, SECRET);
  const tampered = sealed!.replace(/.$/, sealed!.endsWith("a") ? "b" : "a");
  assert.equal(await unsealSession(tampered, SECRET), null);
  assert.equal(await unsealSession(sealed!, "other-secret-other-secret-other"), null);
  assert.equal(await unsealSession("v1.not-json.00", SECRET), null);
});
