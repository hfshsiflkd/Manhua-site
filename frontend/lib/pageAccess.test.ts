import assert from "node:assert/strict";
import test from "node:test";
import { decideDocumentGate, isProtectedAppPath, pathAllowed, EMPTY_PAGE_FLAGS } from "./pageAccess.ts";

const adminPages = {
  ...EMPTY_PAGE_FLAGS,
  admin: true,
  editor: true,
  editorCreateManhua: true,
  editorCreateTeam: true,
  editorLeaderboard: true,
};

const editorPages = {
  ...EMPTY_PAGE_FLAGS,
  editor: true,
  editorCreateManhua: true,
  editorCreateTeam: true,
  editorLeaderboard: true,
};

const teamOnlyPages = {
  ...EMPTY_PAGE_FLAGS,
  editor: true,
};

test("protected path matcher covers nested admin and editor routes", () => {
  assert.equal(isProtectedAppPath("/admin"), true);
  assert.equal(isProtectedAppPath("/admin/users/abc"), true);
  assert.equal(isProtectedAppPath("/editor/teams/new"), true);
  assert.equal(isProtectedAppPath("/login"), false);
  assert.equal(isProtectedAppPath("/recruitment"), false);
  assert.equal(isProtectedAppPath("/creators/abc"), false);
});

test("anonymous and invalid session are 404, never allow", () => {
  for (const path of ["/admin", "/admin/users", "/editor", "/editor/manhuas/new"]) {
    assert.equal(decideDocumentGate({ pathname: path, cookieValid: false, fetchFailed: false, access: null }), "notfound");
  }
});

test("backend outage with a sealed cookie is 503, not a grant and not mixed with 404", () => {
  assert.equal(
    decideDocumentGate({ pathname: "/admin", cookieValid: true, fetchFailed: true, access: null }),
    "unavailable"
  );
});

test("role matrix for page flags", () => {
  assert.equal(pathAllowed("/admin", adminPages), true);
  assert.equal(pathAllowed("/admin/finance", editorPages), false);
  assert.equal(pathAllowed("/editor/manhuas", editorPages), true);
  assert.equal(pathAllowed("/editor/manhuas/new", teamOnlyPages), false);
  assert.equal(pathAllowed("/editor/teams/new", teamOnlyPages), false);
  assert.equal(pathAllowed("/editor/leaderboard", teamOnlyPages), false);
  assert.equal(pathAllowed("/editor/manhuas", teamOnlyPages), true);
  assert.equal(pathAllowed("/editor/teams/new", editorPages), true);
});

test("forged or empty access never opens protected pages", () => {
  assert.equal(pathAllowed("/admin", EMPTY_PAGE_FLAGS), false);
  assert.equal(pathAllowed("/editor", null), false);
  assert.equal(
    decideDocumentGate({
      pathname: "/admin",
      cookieValid: true,
      fetchFailed: false,
      access: { ok: true, role: "admin", teamMember: false, canPublishManhua: true, canCreateTeam: true, pages: EMPTY_PAGE_FLAGS },
    }),
    "notfound"
  );
});
