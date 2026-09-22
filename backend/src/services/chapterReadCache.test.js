const test = require("node:test");
const assert = require("node:assert/strict");

process.env.REDIS_URL = "";

const {
  getPublicChapter,
  setPublicChapter,
  invalidateManhuaChapterReads,
} = require("./chapterReadCache");
const { createChapterOnce } = require("./chapterIdempotency");
const { resolveFreeRead } = require("../utils/freeRead");

test("drafting a chapter drops the cached full pages", async () => {
  const manhuaId = "manhua-draft-test";
  await setPublicChapter(manhuaId, 3, "full", {
    status: "published",
    pages: [{ pageNumber: 1, imageUrl: "https://cdn.test/secret.png" }],
  });
  assert.ok(await getPublicChapter(manhuaId, 3, "full"));
  await invalidateManhuaChapterReads(manhuaId);
  assert.equal(await getPublicChapter(manhuaId, 3, "full"), null);
  assert.equal(await getPublicChapter(manhuaId, 4, "free"), null);
});

test("free read cache turns off after expiresAt even if the cached flag is still active", () => {
  const now = Date.parse("2026-09-22T12:00:00Z");
  assert.equal(
    resolveFreeRead({ active: true, expiresAt: "2026-09-22T11:00:00Z" }, now),
    false
  );
  assert.equal(
    resolveFreeRead({ active: true, expiresAt: "2026-09-22T13:00:00Z" }, now),
    true
  );
});

test("create retry with the same idempotency key does not create a second chapter", async () => {
  const created = [];
  const store = new Map();
  const resultA = await createChapterOnce({
    userId: "editor-1",
    idempotencyKey: "idempotencykey1",
    findById: async (id) => store.get(id) || null,
    create: async () => {
      const doc = { _id: "chapter-1" };
      created.push(doc);
      store.set(doc._id, doc);
      return doc;
    },
  });
  const resultB = await createChapterOnce({
    userId: "editor-1",
    idempotencyKey: "idempotencykey1",
    findById: async (id) => store.get(id) || null,
    create: async () => {
      const doc = { _id: "chapter-2" };
      created.push(doc);
      store.set(doc._id, doc);
      return doc;
    },
  });
  assert.equal(resultA.replayed, false);
  assert.equal(resultB.replayed, true);
  assert.equal(resultB.chapter._id, "chapter-1");
  assert.equal(created.length, 1);
});
