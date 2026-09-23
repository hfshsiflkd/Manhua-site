#!/usr/bin/env node
"use strict";

/**
 * PG-backed HTTP integration tests. Not a substitute for the 33 unit tests.
 * Isolated Docker (default) or hosted Manhua-site Supabase (PG_INTEGRATION_TARGET=hosted).
 * Does not touch production Mongo or Vercel env.
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseEnvFile: parseExplicitEnv,
  isUsablePostgresUrl,
  describePgTarget,
} = require("./loadExplicitEnv");
const { cleanupPgitest, migrationSnapshot } = require("./pgitestCleanup");

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

function resolvePgTarget() {
  const hosted = process.env.PG_INTEGRATION_TARGET === "hosted";
  const backendEnvPath = path.join(__dirname, "../../.env");
  const backendEnv = parseEnvFile(backendEnvPath);
  if (hosted) {
    const supabaseFile = path.join(__dirname, "../../.env.supabase.local");
    const parsed = parseExplicitEnv(supabaseFile);
    const pgUrl = [parsed.values.DATABASE_URL_DIRECT, parsed.values.DATABASE_URL].find(isUsablePostgresUrl);
    const meta = pgUrl ? describePgTarget(pgUrl) : { usable: false };
    if (!pgUrl || !meta.usable || meta.kind !== "hosted" || !meta.hasManhuaRef || meta.isUndrah) {
      return { ok: false, reason: "hosted DATABASE_URL missing or not Manhua-site", backendEnv };
    }
    return { ok: true, kind: "hosted", pgUrl, backendEnv, meta };
  }
  const isolatedCandidates = [
    path.join(os.homedir(), "Library/Application Support/arc-read-db-backups/pg-isolated.env"),
    path.join(__dirname, "../../.env.pg-isolated"),
  ];
  let isolatedEnv = {};
  for (const file of isolatedCandidates) {
    if (fs.existsSync(file)) {
      isolatedEnv = parseEnvFile(file);
      break;
    }
  }
  if (!isolatedEnv.DATABASE_URL || !backendEnv.JWT_SECRET) {
    return { ok: false, reason: "isolated DATABASE_URL or JWT_SECRET missing", backendEnv };
  }
  return {
    ok: true,
    kind: "isolated",
    pgUrl: isolatedEnv.DATABASE_URL,
    backendEnv,
    meta: describePgTarget(isolatedEnv.DATABASE_URL),
  };
}

const target = resolvePgTarget();
const backendEnv = target.backendEnv || {};
if (!target.ok || !backendEnv.JWT_SECRET) {
  test(`pg integration (skipped: ${target.reason || "JWT_SECRET missing"})`, { skip: true }, () => {});
} else {
  process.env.DB_DRIVER = "postgres";
  process.env.DATABASE_URL = target.pgUrl;
  process.env.JWT_SECRET = backendEnv.JWT_SECRET;
  process.env.JWT_EXPIRES_IN = backendEnv.JWT_EXPIRES_IN || "30d";
  console.log(
    JSON.stringify({
      pgIntegration: target.kind,
      host: target.meta.host,
      port: target.meta.port,
      hasManhuaRef: target.meta.hasManhuaRef,
      isUndrah: target.meta.isUndrah,
    })
  );
  for (const key of [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
    "R2_ENDPOINT",
  ]) {
    if (backendEnv[key]) process.env[key] = backendEnv[key];
  }
  process.env.REDIS_URL = "";
  process.env.REDIS_HOST = "";
  process.env.REDIS_PORT = "";
  process.env.PORT = "0";
  delete process.env.MONGO_URI;
  delete process.env.MONGODB_URI;

  const app = require("../../src/app");
  delete process.env.MONGO_URI;
  delete process.env.MONGODB_URI;

  const { closePool, query } = require("../../src/db/postgres");
  const User = require("../../src/models/User");
  const { genSessionToken, genJwt } = require("../../src/utils/token");

  let server;
  let baseUrl;
  let snapshot;
  let testStartedAt;
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Pgitest-pass-9x";
  const ids = {
    users: [],
    teams: [],
    manhuas: [],
    chapters: [],
    comments: [],
    requests: [],
  };

  const ctx = {
    trialUser: null,
    trialToken: null,
    trialDevice: `pgitest-dev-${stamp}-a`,
    secondUser: null,
    secondToken: null,
    admin: null,
    adminToken: null,
    editor: null,
    editorToken: null,
    teamId: null,
    manhua: null,
    chapter: null,
  };

  function request(method, urlPath, { headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
      const hdrs = { ...headers };
      if (body !== undefined) hdrs["content-type"] = "application/json";
      const req = http.request(
        `${baseUrl}${urlPath}`,
        { method, headers: hdrs },
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
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  }

  function authHeaders(token, deviceId) {
    const headers = { authorization: `Bearer ${token}` };
    if (deviceId) headers["x-device-id"] = deviceId;
    return headers;
  }

  async function markPgitest(table, id) {
    if (!id) return;
    await query(
      `UPDATE arc.${table} SET extra = coalesce(extra, '{}'::jsonb) || '{"pgitest":true}'::jsonb WHERE id=$1`,
      [String(id)]
    );
  }

  async function makeStaff(role, username) {
    const deviceId = `pgitest-dev-${stamp}-${role}`;
    const user = await User.create({
      username,
      email: `${username}@pgitest.local`,
      password,
      role,
      sessionToken: genSessionToken(),
      deviceId,
      lastDeviceId: deviceId,
      isVIP: role === "admin",
      vipExpiresAt: role === "admin" ? new Date(Date.now() + 86400000) : null,
      extra: { pgitest: true },
    });
    ids.users.push(String(user._id));
    return { user, token: genJwt(user), deviceId };
  }

  before(async () => {
    await cleanupPgitest(query);
    snapshot = await migrationSnapshot(query);
    testStartedAt = new Date();
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    try {
      await cleanupPgitest(query, { since: testStartedAt });
      const afterSnap = await migrationSnapshot(query);
      assert.deepEqual(afterSnap, snapshot);
    } finally {
      if (server) {
        await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      }
      await closePool();
    }
  });

  test("postgres mode forbids mongoose.connect", async () => {
    assert.equal(process.env.DB_DRIVER, "postgres");
    assert.equal(process.env.MONGO_URI, undefined);
    const mongoose = require("mongoose");
    await assert.rejects(() => mongoose.connect("mongodb://127.0.0.1:27017/should-not"), /forbidden/);
    assert.notEqual(mongoose.connection.readyState, 1);
  });

  test("auth, role, VIP/trial, team, chapter, upload, comments, votes, admin, concurrent", async () => {
    const userName = `pgitu_${stamp}`;
    const secondName = `pgits_${stamp}`;
    const adminName = `pgita_${stamp}`;
    const editorName = `pgite_${stamp}`;

    const registered = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": ctx.trialDevice },
      body: {
        username: userName,
        email: `${userName}@pgitest.local`,
        password,
        deviceId: ctx.trialDevice,
      },
    });
    assert.equal(registered.status, 200, registered.raw);
    assert.ok(registered.json.token);
    assert.equal(registered.json.user.role, "user");
    ctx.trialUser = registered.json.user;
    ctx.trialToken = registered.json.token;
    ids.users.push(String(registered.json.user._id));
    await markPgitest("users", registered.json.user._id);
    const trialGranted = Boolean(registered.json.trial?.granted);
    if (trialGranted) {
      assert.ok(registered.json.user.vipExpiresAt);
    }

    const second = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": ctx.trialDevice },
      body: {
        username: secondName,
        email: `${secondName}@pgitest.local`,
        password,
        deviceId: ctx.trialDevice,
      },
    });
    assert.equal(second.status, 200, second.raw);
    assert.equal(second.json.trial?.granted, false);
    ctx.secondUser = second.json.user;
    ctx.secondToken = second.json.token;
    ids.users.push(String(second.json.user._id));
    await markPgitest("users", second.json.user._id);

    const badLogin = await request("POST", "/api/auth/login", {
      headers: { "x-device-id": ctx.trialDevice },
      body: { identifier: `${userName}@pgitest.local`, password: "wrong-pass-xx" },
    });
    assert.equal(badLogin.status, 400);

    const login = await request("POST", "/api/auth/login", {
      headers: { "x-device-id": ctx.trialDevice },
      body: { identifier: `${userName}@pgitest.local`, password },
    });
    assert.equal(login.status, 200, login.raw);
    ctx.trialToken = login.json.token;

    const me = await request("GET", "/api/auth/me", {
      headers: authHeaders(ctx.trialToken, ctx.trialDevice),
    });
    assert.equal(me.status, 200);
    assert.equal(me.json.user.role, "user");

    const staffAdmin = await makeStaff("admin", adminName);
    ctx.admin = staffAdmin.user;
    ctx.adminToken = staffAdmin.token;
    const staffEditor = await makeStaff("editor", editorName);
    ctx.editor = staffEditor.user;
    ctx.editorToken = staffEditor.token;

    const userAdminDenied = await request("GET", "/api/admin/stats", {
      headers: authHeaders(ctx.trialToken, ctx.trialDevice),
    });
    assert.equal(userAdminDenied.status, 403);

    const userEditorDenied = await request("POST", "/api/editor/manhuas", {
      headers: authHeaders(ctx.secondToken, ctx.trialDevice),
      body: { title: "nope" },
    });
    assert.ok([401, 403].includes(userEditorDenied.status));

    const teamCreateDenied = await request("POST", "/api/editor/teams", {
      headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
      body: { name: `pgitest-team-${stamp}` },
    });
    assert.equal(teamCreateDenied.status, 403);

    const teamCreated = await request("POST", "/api/editor/teams", {
      headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
      body: { name: `pgitest-team-${stamp}`, description: "integration" },
    });
    assert.equal(teamCreated.status, 201, teamCreated.raw);
    ctx.teamId = String(teamCreated.json._id);
    ids.teams.push(ctx.teamId);
    await markPgitest("teams", ctx.teamId);

    const invite = await request("POST", `/api/editor/teams/${ctx.teamId}/members`, {
      headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
      body: { userId: String(ctx.editor._id), role: "editor" },
    });
    assert.equal(invite.status, 200, invite.raw);
    const inviteId = String(invite.json.invite._id || invite.json.invite.id);

    const accept = await request("POST", `/api/me/team-invites/${inviteId}/accept`, {
      headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
    });
    assert.equal(accept.status, 200, accept.raw);

    const manhuaRes = await request("POST", "/api/editor/manhuas", {
      headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
      body: {
        title: `Pgitest ${stamp}`,
        slug: `pgitest-${stamp}`,
        status: "ongoing",
        teamId: ctx.teamId,
      },
    });
    assert.equal(manhuaRes.status, 201, manhuaRes.raw);
    ctx.manhua = manhuaRes.json;
    ids.manhuas.push(String(ctx.manhua._id));
    await markPgitest("manhuas", ctx.manhua._id);

    const outsiderChapter = await request("POST", `/api/editor/manhuas/${ctx.manhua.slug}/chapters`, {
      headers: authHeaders(ctx.secondToken, ctx.trialDevice),
      body: {
        chapterNumber: 1,
        title: "nope",
        status: "published",
        pages: [{ imageUrl: "https://cdn.example.com/pgitest.webp" }],
      },
    });
    assert.ok([401, 403].includes(outsiderChapter.status));

    const page = { imageUrl: "https://cdn.example.com/pgitest.webp" };
    const chRes = await request("POST", `/api/editor/manhuas/${ctx.manhua.slug}/chapters`, {
      headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
      body: {
        chapterNumber: 1,
        title: "Ch 1",
        status: "published",
        pages: [page],
      },
    });
    assert.equal(chRes.status, 201, chRes.raw);
    ctx.chapter = chRes.json;
    ids.chapters.push(String(ctx.chapter._id));
    await markPgitest("chapters", ctx.chapter._id);

    const publicChapter = await request("GET", `/api/manhuas/${encodeURIComponent(ctx.manhua.slug)}/chapters/1`, {
      headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
    });
    assert.equal(publicChapter.status, 200, publicChapter.raw);
    const publicRaw = publicChapter.raw || "";
    assert.equal(publicRaw.includes("https://cdn.example.com/pgitest"), true);
    assert.equal(publicRaw.includes("pgitest-hidden"), false);

    const startRead = await request("POST", `/api/chapters/${ctx.chapter._id}/read/start`, {
      headers: { ...authHeaders(ctx.trialToken, ctx.trialDevice), "x-device-id": ctx.trialDevice },
    });
    assert.equal(startRead.status, 200, startRead.raw);
    assert.ok(startRead.json.token);
    assert.equal((startRead.raw || "").includes("https://cdn.example.com/pgitest"), false);

    const confirmRead = await request("POST", `/api/chapters/${ctx.chapter._id}/read/confirm`, {
      headers: { ...authHeaders(ctx.trialToken, ctx.trialDevice), "x-device-id": ctx.trialDevice },
      body: { token: startRead.json.token },
    });
    assert.equal(confirmRead.status, 200, confirmRead.raw);
    assert.equal(confirmRead.json.counted, true);

    const updated = await request("PUT", `/api/admin/chapters/${ctx.chapter._id}`, {
      headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
      body: { title: "Ch 1 edited", status: "published", pages: [page, { imageUrl: "https://cdn.example.com/pgitest-2.webp" }] },
    });
    assert.equal(updated.status, 200, updated.raw);
    assert.equal(updated.json.title, "Ch 1 edited");

    const limits = await request("GET", "/api/upload/limits");
    assert.equal(limits.status, 200);
    assert.equal(limits.json.chapter.maxBytes, 25 * 1024 * 1024);

    const userChapterPresign = await request("POST", "/api/upload/presign", {
      headers: authHeaders(ctx.trialToken, ctx.trialDevice),
      body: { purpose: "chapter", contentType: "image/webp", contentLength: 1024, fileName: "a.webp" },
    });
    assert.equal(userChapterPresign.status, 403);

    const staffChapterPresign = await request("POST", "/api/upload/presign", {
      headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
      body: { purpose: "chapter", contentType: "image/webp", contentLength: 1024, fileName: "a.webp" },
    });
    assert.ok(
      [200, 500].includes(staffChapterPresign.status),
      `staff presign ${staffChapterPresign.status} ${staffChapterPresign.raw}`
    );
    if (staffChapterPresign.status === 200) {
      assert.ok(staffChapterPresign.json.uploadUrl);
      assert.ok(staffChapterPresign.json.token);
    }

    const comment = await request("POST", `/api/comments/manhua/${ctx.manhua._id}`, {
      headers: authHeaders(ctx.trialToken, ctx.trialDevice),
      body: { text: "pgitest comment" },
    });
    if (comment.status === 403 && comment.json?.code === "ACCESS_EXPIRED") {
      const vip = await request("POST", `/api/admin/users/${ctx.trialUser._id}/vip`, {
        headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
        body: { months: 1, amount: 1000, note: "pgitest" },
      });
      assert.equal(vip.status, 200, vip.raw);
      const retry = await request("POST", `/api/comments/manhua/${ctx.manhua._id}`, {
        headers: authHeaders(ctx.trialToken, ctx.trialDevice),
        body: { text: "pgitest comment" },
      });
      assert.equal(retry.status, 201, retry.raw);
      ids.comments.push(String(retry.json.comment?._id || retry.json._id || retry.json.comment?.id));
    } else {
      assert.equal(comment.status, 201, comment.raw);
      ids.comments.push(String(comment.json.comment?._id || comment.json._id || comment.json.comment?.id));
    }

    const listed = await request("GET", `/api/comments/manhua/${ctx.manhua._id}`, {
      headers: authHeaders(ctx.trialToken, ctx.trialDevice),
    });
    assert.equal(listed.status, 200);
    assert.ok(listed.json.comments.length >= 1);

    const reqCreate = await request("POST", "/api/requests", {
      headers: { ...authHeaders(ctx.trialToken, ctx.trialDevice), "x-device-id": ctx.trialDevice },
      body: { title: `pgitest-req-${stamp}` },
    });
    assert.equal(reqCreate.status, 201, reqCreate.raw);
    const requestId = String(reqCreate.json._id || reqCreate.json.id);
    ids.requests.push(requestId);
    await markPgitest("requests", requestId);

    const vote = await request("POST", `/api/requests/${requestId}/vote`, {
      headers: { ...authHeaders(ctx.editorToken, staffEditor.deviceId), "x-device-id": staffEditor.deviceId },
    });
    assert.equal(vote.status, 200, vote.raw);

    const dupVote = await request("POST", `/api/requests/${requestId}/vote`, {
      headers: { ...authHeaders(ctx.editorToken, staffEditor.deviceId), "x-device-id": staffEditor.deviceId },
    });
    assert.equal(dupVote.status, 409);

    const grant = await request("POST", `/api/admin/users/${ctx.secondUser._id}/vip`, {
      headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
      body: { months: 1, amount: 2500, note: "pgitest-grant" },
    });
    assert.equal(grant.status, 200, grant.raw);
    assert.equal(grant.json.user.isVIP, true);

    const stats = await request("GET", "/api/admin/stats", {
      headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
    });
    assert.equal(stats.status, 200, stats.raw);
    assert.ok(stats.json.totalUsers >= 4);
    assert.ok(stats.json.totalManhuas >= 1);

    const finance = await request("GET", "/api/admin/finance", {
      headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
    });
    assert.equal(finance.status, 200, finance.raw);
    assert.ok(finance.json.monthKey);
    assert.ok(Array.isArray(finance.json.editors));
    assert.ok(finance.json.totalRevenue >= 2500);

    const concurrentSame = await Promise.all([
      request("POST", `/api/editor/manhuas/${ctx.manhua.slug}/chapters`, {
        headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
        body: {
          chapterNumber: 7,
          title: "concurrent-a",
          status: "published",
          pages: [page],
        },
      }),
      request("POST", `/api/editor/manhuas/${ctx.manhua.slug}/chapters`, {
        headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
        body: {
          chapterNumber: 7,
          title: "concurrent-b",
          status: "published",
          pages: [page],
        },
      }),
    ]);
    const statuses = concurrentSame.map((r) => r.status).sort();
    assert.ok(statuses.includes(201), `expected one create, got ${statuses} ${concurrentSame.map((r) => r.raw).join(" | ")}`);
    assert.ok(statuses.includes(409) || statuses.filter((s) => s === 201).length === 1);
    for (const row of concurrentSame) {
      const id = row.json?._id || row.json?.id;
      if (row.status === 201 && id) ids.chapters.push(String(id));
    }

    const concurrentDistinct = await Promise.all([
      request("POST", `/api/editor/manhuas/${ctx.manhua.slug}/chapters`, {
        headers: authHeaders(ctx.editorToken, staffEditor.deviceId),
        body: { chapterNumber: 8, title: "c8", status: "published", pages: [page] },
      }),
      request("POST", `/api/editor/manhuas/${ctx.manhua.slug}/chapters`, {
        headers: authHeaders(ctx.adminToken, staffAdmin.deviceId),
        body: { chapterNumber: 9, title: "c9", status: "published", pages: [page] },
      }),
    ]);
    assert.equal(concurrentDistinct[0].status, 201, concurrentDistinct[0].raw);
    assert.equal(concurrentDistinct[1].status, 201, concurrentDistinct[1].raw);
    ids.chapters.push(String(concurrentDistinct[0].json._id));
    ids.chapters.push(String(concurrentDistinct[1].json._id));

    const voteADevice = `pgitest-vote-${stamp}-a`;
    const voteBDevice = `pgitest-vote-${stamp}-b`;
    const req2 = await request("POST", "/api/requests", {
      headers: { ...authHeaders(ctx.adminToken, staffAdmin.deviceId), "x-device-id": staffAdmin.deviceId },
      body: { title: `pgitest-req2-${stamp}` },
    });
    assert.equal(req2.status, 201, req2.raw);
    const req2Id = String(req2.json._id || req2.json.id);
    ids.requests.push(req2Id);
    await markPgitest("requests", req2Id);
    const concurrentVotes = await Promise.all([
      request("POST", `/api/requests/${req2Id}/vote`, {
        headers: { ...authHeaders(ctx.trialToken, voteADevice), "x-device-id": voteADevice },
      }),
      request("POST", `/api/requests/${req2Id}/vote`, {
        headers: { ...authHeaders(ctx.editorToken, voteBDevice), "x-device-id": voteBDevice },
      }),
    ]);
    const voteStatuses = concurrentVotes.map((r) => r.status);
    assert.ok(
      voteStatuses.every((s) => s === 200 || s === 409),
      `unexpected vote statuses ${voteStatuses} ${concurrentVotes.map((r) => r.raw).join(" | ")}`
    );
    const okVotes = voteStatuses.filter((s) => s === 200).length;
    assert.equal(okVotes, 2, `concurrent votes should both persist, got ${voteStatuses}`);
  });

  test("hidden parent manhua does not leak published chapter or pages", async () => {
    const crypto = require("crypto");
    const staff = await makeStaff("admin", `pgith_${stamp}`);
    const manhuaId = crypto.randomBytes(12).toString("hex");
    const chapterId = crypto.randomBytes(12).toString("hex");
    const slug = `pgitest-hidden-${stamp}`;
    const sentinel = `https://cdn.example.com/pgitest-hidden-${stamp}.webp`;
    ids.manhuas.push(manhuaId);
    ids.chapters.push(chapterId);

    await query(
      `INSERT INTO arc.manhuas (
        id, title, slug, rating, status, created_by, views, weekly_views, deleted_at, extra, created_at, updated_at
      ) VALUES ($1,$2,$3,0,'ongoing',$4,0,0,now(), '{"pgitest":true}'::jsonb, now(), now())`,
      [manhuaId, `Pgitest hidden ${stamp}`, slug, String(staff.user._id)]
    );
    await query(
      `INSERT INTO arc.chapters (
        id, manhua_id, chapter_number, title, language, status, views, extra, created_at, updated_at
      ) VALUES ($1,$2,1,'hidden published','mn','published',0,'{"pgitest":true}'::jsonb, now(), now())`,
      [chapterId, manhuaId]
    );
    await query(
      `INSERT INTO arc.chapter_pages (chapter_id, page_number, image_url, extra)
       VALUES ($1,1,$2,'{"pgitest":true}'::jsonb)`,
      [chapterId, sentinel]
    );

    const list = await request("GET", `/api/manhuas?q=${encodeURIComponent("pgitest-hidden")}&limit=50`);
    assert.equal(list.status, 200);
    const leakedList = JSON.stringify(list.json || {});
    assert.equal(leakedList.includes(slug), false);
    assert.equal(leakedList.includes(sentinel), false);

    const detail = await request("GET", `/api/manhuas/${encodeURIComponent(slug)}`);
    assert.equal(detail.status, 404, detail.raw);
    assert.equal((detail.raw || "").includes(sentinel), false);

    const chapters = await request("GET", `/api/manhuas/${encodeURIComponent(slug)}/chapters`);
    assert.equal(chapters.status, 404, chapters.raw);
    assert.equal((chapters.raw || "").includes(sentinel), false);

    const one = await request("GET", `/api/manhuas/${encodeURIComponent(slug)}/chapters/1`);
    assert.equal(one.status, 404, one.raw);
    assert.equal((one.raw || "").includes(sentinel), false);

    const start = await request("POST", `/api/chapters/${chapterId}/read/start`, {
      headers: { "x-device-id": "pgitest-hidden-device" },
    });
    assert.equal(start.status, 404, start.raw);
    assert.equal((start.raw || "").includes(sentinel), false);

    const confirm = await request("POST", `/api/chapters/${chapterId}/read/confirm`, {
      headers: { "x-device-id": "pgitest-hidden-device" },
      body: { token: "not-a-token" },
    });
    assert.equal(confirm.status === 404 || confirm.status === 400, true, confirm.raw);
    assert.equal((confirm.raw || "").includes(sentinel), false);
  });

  test("API_READ_ONLY blocks POST/PUT/PATCH/DELETE, GET side-effects, and store writes", async () => {
    const crypto = require("crypto");
    const staff = await makeStaff("admin", `pgitf_${stamp}`);
    const manhuaId = crypto.randomBytes(12).toString("hex");
    const chapterId = crypto.randomBytes(12).toString("hex");
    const slug = `pgitest-freeze-${stamp}`;
    ids.manhuas.push(manhuaId);
    ids.chapters.push(chapterId);
    await query(
      `INSERT INTO arc.manhuas (
        id, title, slug, rating, status, created_by, views, weekly_views, extra, created_at, updated_at
      ) VALUES ($1,$2,$3,0,'ongoing',$4,9,0,'{"pgitest":true}'::jsonb, now(), now())`,
      [manhuaId, `Pgitest freeze ${stamp}`, slug, String(staff.user._id)]
    );
    await query(
      `INSERT INTO arc.chapters (
        id, manhua_id, chapter_number, title, language, status, views, extra, created_at, updated_at
      ) VALUES ($1,$2,1,'freeze ch','mn','published',4,'{"pgitest":true}'::jsonb, now(), now())`,
      [chapterId, manhuaId]
    );
    const viewsBefore = await query(`SELECT views FROM arc.chapters WHERE id=$1`, [chapterId]);
    const auditBefore = await query(`SELECT count(*)::int AS n FROM arc.audit_logs`);
    const { enqueueEmail } = require("../../src/queues/emailQueue");

    process.env.API_READ_ONLY = "1";
    try {
      const health = await request("GET", "/");
      assert.equal(health.status, 200, health.raw);
      assert.equal(health.json.readOnly, true);
      assert.equal(health.json.inflightMutations, 0);

      for (const [method, urlPath, extra] of [
        ["POST", "/api/auth/login", { body: { identifier: "nobody@pgitest.local", password: "x" } }],
        ["PUT", `/api/admin/chapters/${chapterId}`, { body: { title: "nope" } }],
        ["PATCH", `/api/user/profile`, { body: { username: "nope" } }],
        ["DELETE", `/api/admin/chapters/${chapterId}`, {}],
      ]) {
        const blocked = await request(method, urlPath, {
          headers: { ...authHeaders(staff.token, staff.deviceId), "x-device-id": staff.deviceId },
          ...extra,
        });
        assert.equal(blocked.status, 503, `${method} ${urlPath} ${blocked.status} ${blocked.raw}`);
        assert.equal(blocked.json.code, "READ_ONLY");
      }

      const list = await request("GET", "/api/manhuas?limit=1");
      assert.equal(list.status, 200, list.raw);

      const chapterGet = await request("GET", `/api/manhuas/${encodeURIComponent(slug)}/chapters/1`, {
        headers: authHeaders(staff.token, staff.deviceId),
      });
      assert.equal(chapterGet.status, 200, chapterGet.raw);

      const me = await request("GET", "/api/auth/me", {
        headers: authHeaders(staff.token, staff.deviceId),
      });
      assert.equal(me.status, 200, me.raw);

      const viewsAfter = await query(`SELECT views FROM arc.chapters WHERE id=$1`, [chapterId]);
      assert.equal(Number(viewsAfter.rows[0].views), Number(viewsBefore.rows[0].views));
      const manhuaViews = await query(`SELECT views FROM arc.manhuas WHERE id=$1`, [manhuaId]);
      assert.equal(Number(manhuaViews.rows[0].views), 9);
      const auditAfter = await query(`SELECT count(*)::int AS n FROM arc.audit_logs`);
      assert.equal(auditAfter.rows[0].n, auditBefore.rows[0].n);

      await assert.rejects(
        () => query(`UPDATE arc.chapters SET views = views + 1 WHERE id=$1`, [chapterId]),
        (err) => err && err.code === "READ_ONLY"
      );
      await assert.rejects(
        () =>
          query(
            `INSERT INTO arc.audit_logs (id, ts, level, category, action, message, extra) VALUES ('pgitest-audit', now(), 'INFO', 'system', 'x', 'x', '{}'::jsonb)`
          ),
        (err) => err && err.code === "READ_ONLY"
      );
      await assert.rejects(
        () => query(`DELETE FROM arc.chapters WHERE id=$1`, [chapterId]),
        (err) => err && err.code === "READ_ONLY"
      );

      const mailed = await enqueueEmail({ to: "nobody@pgitest.local", subject: "x", html: "x" });
      assert.equal(mailed.skipped, true);
    } finally {
      delete process.env.API_READ_ONLY;
    }
  });
}
