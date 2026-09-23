"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseTeamCreateBody,
  FieldError,
  canCreateTeam,
} = require("./teamCreateService");
const {
  isSelfServeTeamCreationEnabled,
  activeOwnerLimitReached,
  ACTIVE_TEAM_LIMIT,
} = require("../config/selfServeTeam");

const BIO = "Энэ бол хангалттай урт багийн танилцуулга юм.";

test("team create body requires name, bio, and terms for self-serve editors", () => {
  assert.throws(() => parseTeamCreateBody({ name: "A" }, { requireTerms: true, requireDescription: true }), FieldError);
  assert.throws(
    () => parseTeamCreateBody({ name: "Arc Team", description: "short", acceptTerms: true }, { requireTerms: true, requireDescription: true }),
    FieldError
  );
  assert.throws(
    () => parseTeamCreateBody({ name: "Arc Team", description: BIO, acceptTerms: false }, { requireTerms: true, requireDescription: true }),
    FieldError
  );
  const ok = parseTeamCreateBody(
    { name: "Arc Team", description: BIO, acceptTerms: true, ownerId: "deadbeefdeadbeefdeadbeef", role: "admin", members: [{ role: "owner" }] },
    { requireTerms: true, requireDescription: true }
  );
  assert.equal(ok.name, "Arc Team");
  assert.equal(ok.description, BIO);
  assert.equal(ok.acceptTerms, true);
  assert.equal(ok.ownerId, undefined);
});

test("admin may omit terms and short description; still caps name length", () => {
  const ok = parseTeamCreateBody({ name: "Ops" }, { requireTerms: false, requireDescription: false });
  assert.equal(ok.name, "Ops");
  assert.throws(
    () => parseTeamCreateBody({ name: "x".repeat(61) }, { requireTerms: false, requireDescription: false }),
    FieldError
  );
});

test("canCreateTeam: admin always; editor follows flag; user/translator never", () => {
  const prev = process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
  delete process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
  assert.equal(canCreateTeam({ role: "admin" }), true);
  assert.equal(canCreateTeam({ role: "editor" }), true);
  assert.equal(canCreateTeam({ role: "user" }), false);
  assert.equal(canCreateTeam({ role: "translator" }), false);
  process.env.SELF_SERVE_TEAM_CREATION_ENABLED = "false";
  assert.equal(isSelfServeTeamCreationEnabled(), false);
  assert.equal(canCreateTeam({ role: "admin" }), true);
  assert.equal(canCreateTeam({ role: "editor" }), false);
  if (prev == null) delete process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
  else process.env.SELF_SERVE_TEAM_CREATION_ENABLED = prev;
});

test("active owner cap is 2 for editors; admin exempt; existing over-cap is not deleted", () => {
  assert.equal(ACTIVE_TEAM_LIMIT, 2);
  assert.equal(activeOwnerLimitReached(2, false), true);
  assert.equal(activeOwnerLimitReached(1, false), false);
  assert.equal(activeOwnerLimitReached(9, true), false);
});
