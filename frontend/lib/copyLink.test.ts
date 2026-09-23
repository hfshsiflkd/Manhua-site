import assert from "node:assert/strict";
import test from "node:test";
import { copyTextToClipboard } from "./copyLink.ts";

function mockClipboard(partial: { writeText?: (value: string) => Promise<void>; readText?: () => Promise<string> } | null) {
  if (!("navigator" in globalThis) || globalThis.navigator == null) {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {}, writable: true });
  }
  const nav = globalThis.navigator as Navigator & { clipboard?: unknown };
  const prev = nav.clipboard;
  Object.defineProperty(nav, "clipboard", {
    configurable: true,
    value: partial,
  });
  return () => {
    Object.defineProperty(nav, "clipboard", { configurable: true, value: prev });
  };
}

test("copy succeeds only after writeText resolves", async () => {
  const restore = mockClipboard({
    writeText: async () => {},
  });
  try {
    assert.equal(await copyTextToClipboard("https://www.arc-read.com/creators/abc"), true);
  } finally {
    restore();
  }
});

test("copy fails when writeText throws", async () => {
  const restore = mockClipboard({
    writeText: async () => {
      throw new Error("NotAllowedError");
    },
  });
  try {
    assert.equal(await copyTextToClipboard("https://www.arc-read.com/creators/abc"), false);
  } finally {
    restore();
  }
});

test("copy fails when clipboard is missing", async () => {
  const restore = mockClipboard(null);
  try {
    assert.equal(await copyTextToClipboard("https://www.arc-read.com/creators/abc"), false);
  } finally {
    restore();
  }
});

test("copy fails when readText returns a different value", async () => {
  const restore = mockClipboard({
    writeText: async () => {},
    readText: async () => "http://localhost:3018/creators/abc",
  });
  try {
    assert.equal(await copyTextToClipboard("https://www.arc-read.com/creators/abc"), false);
  } finally {
    restore();
  }
});

test("copy succeeds when write matches readText", async () => {
  const url = "https://www.arc-read.com/creators/abc";
  const restore = mockClipboard({
    writeText: async () => {},
    readText: async () => url,
  });
  try {
    assert.equal(await copyTextToClipboard(url), true);
  } finally {
    restore();
  }
});
