#!/usr/bin/env node
"use strict";

/**
 * Isolated Postgres API checks. Does not touch production Mongo or Vercel env.
 * Loads DATABASE_URL from a local isolated env file; never prints secrets.
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1);
  }
  return out;
}

const backendEnvPath = path.join(__dirname, "../../.env");
const isolatedCandidates = [
  path.join(os.homedir(), "Library/Application Support/arc-read-db-backups/pg-isolated.env"),
  path.join(__dirname, "../../.env.pg-isolated"),
];

const backendEnv = parseEnvFile(backendEnvPath);
let isolatedEnv = {};
for (const file of isolatedCandidates) {
  if (fs.existsSync(file)) {
    isolatedEnv = parseEnvFile(file);
    break;
  }
}

if (!isolatedEnv.DATABASE_URL || !backendEnv.JWT_SECRET) {
  test("isolated postgres API (skipped)", { skip: true }, () => {});
} else {
  process.env.DB_DRIVER = "postgres";
  process.env.DATABASE_URL = isolatedEnv.DATABASE_URL;
  process.env.JWT_SECRET = backendEnv.JWT_SECRET;
  process.env.REDIS_URL = "";
  process.env.REDIS_HOST = "";
  process.env.REDIS_PORT = "";
  process.env.PORT = "0";

  const app = require("../../src/app");
  const { closePool } = require("../../src/db/postgres");

  let server;
  let baseUrl;

  function request(method, urlPath, { headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `${baseUrl}${urlPath}`,
        { method, headers: { "content-type": "application/json", ...headers } },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            let json = null;
            try {
              json = raw ? JSON.parse(raw) : null;
            } catch {
              json = null;
            }
            resolve({ status: res.statusCode, json, raw });
          });
        }
      );
      req.on("error", reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  before(async () => {
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await closePool();
  });

  test("GET / health", async () => {
    const res = await request("GET", "/");
    assert.equal(res.status, 200);
    assert.match(res.json.message, /Manhua API/);
  });

  test("GET /api/upload/limits", async () => {
    const res = await request("GET", "/api/upload/limits");
    assert.equal(res.status, 200);
    assert.ok(res.json.chapter);
    assert.equal(res.json.chapter.maxBytes, 25 * 1024 * 1024);
  });

  test("GET /api/settings/free-read", async () => {
    const res = await request("GET", "/api/settings/free-read");
    assert.equal(res.status, 200);
    assert.equal(typeof res.json.active, "boolean");
  });

  test("GET /api/manhuas list + Cyrillic ILIKE", async () => {
    const list = await request("GET", "/api/manhuas?limit=5");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.json.items));
    assert.ok(list.json.total >= 1);
    const first = list.json.items[0];
    assert.ok(first.slug);
    assert.ok(first.title);

    const cyr = String(first.title).match(/[\u0400-\u04FF]{2,}/);
    if (cyr) {
      const q = encodeURIComponent(cyr[0].slice(0, 2));
      const search = await request("GET", `/api/manhuas?q=${q}&limit=20`);
      assert.equal(search.status, 200);
      assert.ok(search.json.total >= 1, "Cyrillic ILIKE should return rows");
    }

    const detail = await request("GET", `/api/manhuas/${encodeURIComponent(first.slug)}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.slug, first.slug);

    const chapters = await request("GET", `/api/manhuas/${encodeURIComponent(first.slug)}/chapters`);
    assert.equal(chapters.status, 200);
    assert.ok(Array.isArray(chapters.json));
    if (chapters.json[0]?.chapterNumber != null) {
      const ch = await request(
        "GET",
        `/api/manhuas/${encodeURIComponent(first.slug)}/chapters/${chapters.json[0].chapterNumber}`
      );
      assert.equal(ch.status, 200);
      assert.equal(typeof ch.json.pageCount, "number");
    }
  });

  test("POST /api/auth/login + favorites", async () => {
    const login = await request("POST", "/api/auth/login", {
      headers: { "x-device-id": "isolated-api-test-device" },
      body: {
        identifier: "pg-migrate-test@test.local",
        password: "migrate-test-pass-9",
      },
    });
    assert.equal(login.status, 200, login.json?.message || login.raw);
    assert.ok(login.json.token);
    assert.ok(login.json.user);
    assert.ok(!JSON.stringify(login.json).includes("password_hash"));

    const token = login.json.token;
    const favs = await request("GET", "/api/me/favorites", {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(favs.status, 200);
    assert.ok(Array.isArray(favs.json));

    const list = await request("GET", "/api/manhuas?limit=1");
    const manhuaId = list.json.items[0]._id;
    const toggle = await request("POST", `/api/me/favorites/${manhuaId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.ok([200, 201].includes(toggle.status));
    await request("POST", `/api/me/favorites/${manhuaId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  });
}
