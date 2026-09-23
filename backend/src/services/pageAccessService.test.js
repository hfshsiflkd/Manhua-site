"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pagesFromFacts, emptyPages } = require("./pageAccessService");

test("blocked or inactive users get no pages even if they were admin", () => {
  assert.deepEqual(
    pagesFromFacts({ role: "admin", blocked: true, isActive: true, editorWorkspace: true, createTeam: true }),
    emptyPages()
  );
  assert.deepEqual(
    pagesFromFacts({ role: "editor", blocked: false, isActive: false, editorWorkspace: true, createTeam: true }),
    emptyPages()
  );
});

test("site admin gets admin and editor pages including creates", () => {
  const pages = pagesFromFacts({
    role: "admin",
    blocked: false,
    isActive: true,
    editorWorkspace: true,
    createTeam: true,
  });
  assert.equal(pages.admin, true);
  assert.equal(pages.editor, true);
  assert.equal(pages.editorCreateManhua, true);
  assert.equal(pages.editorCreateTeam, true);
  assert.equal(pages.editorLeaderboard, true);
});

test("self-serve editor is not admin and may create manhua/team", () => {
  const pages = pagesFromFacts({
    role: "editor",
    blocked: false,
    isActive: true,
    editorWorkspace: true,
    createTeam: true,
  });
  assert.equal(pages.admin, false);
  assert.equal(pages.editor, true);
  assert.equal(pages.editorCreateManhua, true);
  assert.equal(pages.editorCreateTeam, true);
  assert.equal(pages.editorLeaderboard, true);
});

test("translator gets editor workspace and manhua create, not team create or leaderboard", () => {
  const pages = pagesFromFacts({
    role: "translator",
    blocked: false,
    isActive: true,
    editorWorkspace: true,
    createTeam: false,
  });
  assert.equal(pages.admin, false);
  assert.equal(pages.editor, true);
  assert.equal(pages.editorCreateManhua, true);
  assert.equal(pages.editorCreateTeam, false);
  assert.equal(pages.editorLeaderboard, false);
});

test("team-only user gets editor workspace but not create pages", () => {
  const pages = pagesFromFacts({
    role: "user",
    blocked: false,
    isActive: true,
    editorWorkspace: true,
    createTeam: false,
  });
  assert.equal(pages.admin, false);
  assert.equal(pages.editor, true);
  assert.equal(pages.editorCreateManhua, false);
  assert.equal(pages.editorCreateTeam, false);
  assert.equal(pages.editorLeaderboard, false);
});

test("ordinary user without membership gets nothing", () => {
  const pages = pagesFromFacts({
    role: "user",
    blocked: false,
    isActive: true,
    editorWorkspace: false,
    createTeam: false,
  });
  assert.deepEqual(pages, emptyPages());
});
