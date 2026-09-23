"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateListingInput,
  validateApplicationInput,
  isListingAccepting,
  toPublicListing,
  FieldError,
} = require("./teamRecruitmentService");
const { isRecruitmentEnabled } = require("../config/teamRecruitment");

test("listing validation enforces title, description, paid note, https-only is not here", () => {
  assert.throws(
    () => validateListingInput({ title: "hi", workRole: "translation", description: "short", languages: ["mn"], compensation: "volunteer", expiresInDays: 30 }),
    FieldError
  );
  const ok = validateListingInput({
    title: "Орчуулагч хайж байна",
    workRole: "translation",
    description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
    languages: ["mn"],
    compensation: "volunteer",
    expiresInDays: 30,
  });
  assert.equal(ok.workRole, "translation");
  assert.throws(
    () =>
      validateListingInput({
        title: "Төлбөртэй зар нэр",
        workRole: "cleanup",
        description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
        languages: ["mn"],
        compensation: "paid",
        expiresInDays: 30,
      }),
    FieldError
  );
});

test("application validation requires join consent and intro length", () => {
  assert.throws(
    () => validateApplicationInput({ intro: "too short", experience: "beginner", weeklyHoursNote: "5h", acceptJoin: true }),
    FieldError
  );
  assert.throws(
    () =>
      validateApplicationInput({
        intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.",
        experience: "beginner",
        weeklyHoursNote: "5h",
        acceptJoin: false,
      }),
    FieldError
  );
  const ok = validateApplicationInput({
    intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.",
    experience: "experienced",
    weeklyHoursNote: "10 цаг",
    portfolioUrl: "https://example.com/me",
    acceptJoin: true,
  });
  assert.equal(ok.portfolioUrl, "https://example.com/me");
  assert.throws(
    () =>
      validateApplicationInput({
        intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.",
        experience: "experienced",
        weeklyHoursNote: "10 цаг",
        portfolioUrl: "javascript:alert(1)",
        acceptJoin: true,
      }),
    FieldError
  );
});

test("expired or hidden listings are not accepting", () => {
  assert.equal(
    isListingAccepting({
      status: "open",
      hidden_at: null,
      expires_at: new Date(Date.now() + 86400000),
    }),
    true
  );
  assert.equal(
    isListingAccepting({
      status: "open",
      hidden_at: null,
      expires_at: new Date(Date.now() - 1000),
    }),
    false
  );
  assert.equal(
    isListingAccepting({
      status: "open",
      hidden_at: new Date(),
      expires_at: new Date(Date.now() + 86400000),
    }),
    false
  );
});

test("public listing DTO does not include applicant or email", () => {
  const dto = toPublicListing({
    id: "abc",
    title: "Зар",
    team_id: "t1",
    team_name: "Team",
    manhua_public: true,
    manhua_id: "m1",
    manhua_title: "Title",
    manhua_slug: "slug",
    manhua_cover: "https://cdn.example.com/x.webp",
    work_role: "translation",
    compensation: "volunteer",
    compensation_note: null,
    description: "desc",
    languages: ["mn"],
    skills: [],
    weekly_hours_note: null,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 86400000),
    status: "open",
    hidden_at: null,
    email: "secret@example.com",
  });
  assert.equal(dto.email, undefined);
  assert.equal(dto.applicant, undefined);
  assert.equal(dto.manhua.title, "Title");
});

test("feature flag defaults on", () => {
  const prev = process.env.TEAM_RECRUITMENT_ENABLED;
  delete process.env.TEAM_RECRUITMENT_ENABLED;
  assert.equal(isRecruitmentEnabled(), true);
  process.env.TEAM_RECRUITMENT_ENABLED = "false";
  assert.equal(isRecruitmentEnabled(), false);
  if (prev == null) delete process.env.TEAM_RECRUITMENT_ENABLED;
  else process.env.TEAM_RECRUITMENT_ENABLED = prev;
});
