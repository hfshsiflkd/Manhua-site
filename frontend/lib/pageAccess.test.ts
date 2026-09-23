import assert from "node:assert/strict";
import test from "node:test";
import {
  decideDocumentGate,
  isProtectedAppPath,
  pathAllowed,
  shouldReloadAfterBridge,
  sessionBridgeMarker,
  EMPTY_PAGE_FLAGS,
} from "./pageAccess.ts";

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

const translatorPages = {
  ...EMPTY_PAGE_FLAGS,
  editor: true,
  editorCreateManhua: true,
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
  assert.equal(pathAllowed("/editor", translatorPages), true);
  assert.equal(pathAllowed("/editor/manhuas", translatorPages), true);
  assert.equal(pathAllowed("/editor/manhuas/new", translatorPages), true);
  assert.equal(pathAllowed("/editor/manhuas/new?teamId=abc", translatorPages), true);
  assert.equal(pathAllowed("/editor/teams/new", translatorPages), false);
  assert.equal(pathAllowed("/editor/teams/new/", translatorPages), false);
  assert.equal(pathAllowed("/editor/leaderboard", translatorPages), false);
  assert.equal(pathAllowed("/editor/leaderboard", editorPages), true);
  assert.equal(pathAllowed("/admin", translatorPages), false);
  assert.equal(
    decideDocumentGate({
      pathname: "/editor/teams/new",
      cookieValid: true,
      fetchFailed: false,
      access: {
        ok: true,
        role: "translator",
        teamMember: true,
        canPublishManhua: true,
        canCreateTeam: false,
        pages: translatorPages,
      },
    }),
    "notfound"
  );
});

test("legacy localStorage bridge reloads once only when the path is allowed", () => {
  assert.equal(
    shouldReloadAfterBridge({ alreadyBridged: false, pathname: "/editor/teams/new", pages: editorPages }),
    true
  );
  assert.equal(
    shouldReloadAfterBridge({ alreadyBridged: true, pathname: "/editor/teams/new", pages: editorPages }),
    false
  );
  assert.equal(
    shouldReloadAfterBridge({ alreadyBridged: false, pathname: "/editor/teams/new", pages: translatorPages }),
    false
  );
  assert.equal(
    shouldReloadAfterBridge({ alreadyBridged: false, pathname: "/login", pages: editorPages }),
    false
  );
  const oldToken = "aaaaaaaaaaaaaaaaaaaaaaaaOLD";
  const newToken = "bbbbbbbbbbbbbbbbbbbbbbbbNEW";
  assert.notEqual(sessionBridgeMarker(oldToken), sessionBridgeMarker(newToken));
  assert.equal(
    shouldReloadAfterBridge({
      alreadyBridged: sessionBridgeMarker(newToken) === sessionBridgeMarker(oldToken),
      pathname: "/editor",
      pages: editorPages,
    }),
    true
  );
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
