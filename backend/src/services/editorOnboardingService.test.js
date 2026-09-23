"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  FieldError,
  pickOnboarding,
  validateAndNormalize,
} = require("./editorOnboardingService");

const valid = {
  penName: "Arc Pen",
  bio: "Энэ бол хангалттай урт танилцуулга текст юм.",
  skills: ["translation", "cleanup"],
  experience: "beginner",
  languages: ["mn"],
  acceptTerms: true,
};

test("pickOnboarding ignores role, userId and privilege fields", () => {
  const picked = pickOnboarding({
    ...valid,
    role: "admin",
    userId: "abc",
    isAdmin: true,
    isVIP: true,
    extra: { hack: true },
  });
  assert.equal(picked.penName, "Arc Pen");
  assert.equal(picked.role, undefined);
  assert.equal(picked.userId, undefined);
  assert.equal(picked.isAdmin, undefined);
});

test("validateAndNormalize accepts a complete onboarding payload", () => {
  const out = validateAndNormalize(valid);
  assert.equal(out.penName, "Arc Pen");
  assert.deepEqual(out.skills, ["translation", "cleanup"]);
  assert.equal(out.experience, "beginner");
});

test("validateAndNormalize returns Mongolian field errors", () => {
  assert.throws(
    () =>
      validateAndNormalize({
        penName: "x",
        bio: "too short",
        skills: [],
        experience: "nope",
        languages: [],
        acceptTerms: false,
        portfolioUrl: "http://insecure.example",
      }),
    (err) => {
      assert.ok(err instanceof FieldError);
      assert.match(err.fields.penName, /2–40/);
      assert.match(err.fields.bio, /20–500/);
      assert.match(err.fields.skills, /дор хаяж нэг/);
      assert.match(err.fields.experience, /Туршлага/);
      assert.match(err.fields.languages, /хэл/);
      assert.match(err.fields.acceptTerms, /дүрм/);
      assert.match(err.fields.portfolioUrl, /HTTPS/);
      return true;
    }
  );
});
