import assert from "node:assert/strict";
import test from "node:test";
import { jobsNeedingUpload, pagesInOrder, savePages } from "./uploadSession.ts";

test("retry uploads only failed files and keeps earlier pages in order", () => {
  const jobs = [
    { id: "a", status: "uploaded" as const, pages: [{ imageUrl: "https://cdn/a.png", originalName: "a" }] },
    { id: "b", status: "failed" as const, pages: [] },
    { id: "c", status: "uploaded" as const, pages: [{ imageUrl: "https://cdn/c.png?X-Amz-Signature=abc", sourceUrl: "https://cdn/c.png", originalName: "c" }] },
  ];
  assert.deepEqual(jobsNeedingUpload(jobs).map((job) => job.id), ["b"]);
  const pages = pagesInOrder(jobs);
  assert.equal(pages[0].imageUrl, "https://cdn/a.png");
  assert.equal(pages[1].imageUrl, "https://cdn/c.png");
  assert.equal(pages[1].pageNumber, 2);
});

test("PUT 500 does not count as success", async () => {
  const result = await savePages(async () => {
    const err = new Error("Request failed") as Error & { response?: { data: { message: string } } };
    err.response = { data: { message: "Server error" } };
    throw err;
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.message, "Server error");
});

test("network failure does not count as success", async () => {
  const result = await savePages(async () => {
    throw new Error("Network Error");
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /Network Error/);
});

test("successful save is the only ok result", async () => {
  const result = await savePages(async () => {});
  assert.equal(result.ok, true);
});
