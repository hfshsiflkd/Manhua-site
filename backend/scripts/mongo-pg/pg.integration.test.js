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
const { cleanupPgitest, migrationSnapshot, applySqlFile } = require("./pgitestCleanup");

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
    await applySqlFile(
      query,
      path.join(__dirname, "../../../supabase/migrations/20260923120000_self_serve_editor.sql")
    );
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

  test("self-serve editor onboarding, JWT refresh, ownership, quota, regressions", async () => {
    const jwt = require("jsonwebtoken");
    const { newId } = require("../../src/store/pg/helpers");
    const quota = require("../../src/services/editorQuotaService");
    const { invalidateUserCache } = require("../../src/middleware/authMiddleware");
    const onboardStamp = `${stamp}sse`;
    const deviceId = `pgitest-dev-${onboardStamp}`;
    const passwordHashBefore = {};

    function onboardBody(overrides = {}) {
      return {
        penName: "Arc Pen",
        bio: "Энэ бол хангалттай урт танилцуулга текст юм шүү.",
        skills: ["translation", "cleanup"],
        experience: "beginner",
        languages: ["mn"],
        acceptTerms: true,
        role: "admin",
        userId: "ffffffffffffffffffffffff",
        isAdmin: true,
        ...overrides,
      };
    }

    async function makeUser(username, extras = {}) {
      const user = await User.create({
        username,
        email: `${username}@pgitest.local`,
        password,
        role: "user",
        sessionToken: genSessionToken(),
        deviceId,
        lastDeviceId: deviceId,
        extra: { pgitest: true },
        ...extras,
      });
      ids.users.push(String(user._id));
      return { user, token: genJwt(user) };
    }

    if (!ctx.manhua) {
      const admin = ctx.admin ? { user: ctx.admin, token: ctx.adminToken } : await makeStaff("admin", `pgitsad_${onboardStamp}`);
      const parent = await request("POST", "/api/editor/manhuas", {
        headers: authHeaders(admin.token, deviceId),
        body: { title: `Pgitest sse parent ${onboardStamp}`, slug: `pgitest-sse-parent-${onboardStamp}` },
      });
      assert.equal(parent.status, 201, parent.raw);
      ctx.manhua = parent.json;
      ids.manhuas.push(String(parent.json._id));
      await markPgitest("manhuas", parent.json._id);
    }

    const unauth = await request("POST", "/api/user/become-editor", { body: onboardBody() });
    assert.equal(unauth.status, 401);

    const userA = await makeUser(`pgitse_${onboardStamp}a`, { isVIP: true, vipExpiresAt: new Date(Date.now() + 86400000) });
    const userB = await makeUser(`pgitse_${onboardStamp}b`);
    const failUser = await makeUser(`pgitse_${onboardStamp}f`);
    const quotaUser = await makeUser(`pgitse_${onboardStamp}q`);

    const hashA = await query(`SELECT password_hash, is_vip, username FROM arc.users WHERE id=$1`, [
      String(userA.user._id),
    ]);
    passwordHashBefore.id = String(userA.user._id);
    passwordHashBefore.hash = hashA.rows[0].password_hash;
    passwordHashBefore.vip = hashA.rows[0].is_vip;
    passwordHashBefore.username = hashA.rows[0].username;

    const fav = await request("POST", `/api/me/favorites/${ctx.manhua._id}`, {
      headers: authHeaders(userA.token, deviceId),
    });
    assert.ok([200, 201].includes(fav.status), fav.raw);
    const bm = await request("POST", "/api/me/bookmarks", {
      headers: authHeaders(userA.token, deviceId),
      body: { manhuaId: String(ctx.manhua._id), chapterNumber: 1, pageNumber: 1 },
    });
    assert.ok([200, 201].includes(bm.status), bm.raw);

    const invalid = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(userA.token, deviceId),
      body: onboardBody({ penName: "x", acceptTerms: false, bio: "short" }),
    });
    assert.equal(invalid.status, 400, invalid.raw);
    assert.ok(invalid.json.fields.penName);
    assert.ok(invalid.json.fields.acceptTerms);

    await query(`UPDATE arc.users SET blocked=true WHERE id=$1`, [String(userB.user._id)]);
    await invalidateUserCache(String(userB.user._id));
    const banned = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(userB.token, deviceId),
      body: onboardBody({ penName: "Banned Pen" }),
    });
    assert.ok([401, 403].includes(banned.status), banned.raw);
    await query(`UPDATE arc.users SET blocked=false, is_active=true WHERE id=$1`, [String(userB.user._id)]);
    await invalidateUserCache(String(userB.user._id));

    await query(`UPDATE arc.users SET lock_until=now() + interval '10 minutes', lock_reason='LOCKED' WHERE id=$1`, [
      String(userB.user._id),
    ]);
    await invalidateUserCache(String(userB.user._id));
    const locked = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(userB.token, deviceId),
      body: onboardBody({ penName: "Locked Pen" }),
    });
    assert.equal(locked.status, 423, locked.raw);
    await query(`UPDATE arc.users SET lock_until=NULL, lock_reason='' WHERE id=$1`, [String(userB.user._id)]);
    await invalidateUserCache(String(userB.user._id));

    const adminActor = ctx.adminToken
      ? { token: ctx.adminToken, id: String(ctx.admin._id) }
      : await makeStaff("admin", `pgitsab_${onboardStamp}`).then((s) => ({
          token: s.token,
          id: String(s.user._id),
        }));
    const editorActor = ctx.editorToken
      ? { token: ctx.editorToken }
      : await makeStaff("editor", `pgitseleg_${onboardStamp}`).then((s) => ({ token: s.token }));

    const adminBlocked = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(adminActor.token, deviceId),
      body: onboardBody(),
    });
    assert.equal(adminBlocked.status, 403, adminBlocked.raw);
    const adminRole = await query(`SELECT role FROM arc.users WHERE id=$1`, [adminActor.id]);
    assert.equal(adminRole.rows[0].role, "admin");

    const legacyEditor = await request("POST", "/api/editor/manhuas", {
      headers: authHeaders(editorActor.token, deviceId),
      body: { title: `Pgitest legacy ${onboardStamp}`, slug: `pgitest-legacy-${onboardStamp}` },
    });
    assert.equal(legacyEditor.status, 201, legacyEditor.raw);
    ids.manhuas.push(String(legacyEditor.json._id));
    await markPgitest("manhuas", legacyEditor.json._id);

    await query(
      `UPDATE arc.users SET extra = coalesce(extra,'{}'::jsonb) || '{"pgitest":true,"pgitestTxFail":true}'::jsonb WHERE id=$1`,
      [String(failUser.user._id)]
    );
    await invalidateUserCache(String(failUser.user._id));
    const txFail = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(failUser.token, deviceId),
      body: onboardBody({ penName: "Fail Pen" }),
    });
    assert.ok(txFail.status >= 500, txFail.raw);
    const failState = await query(`SELECT role FROM arc.users WHERE id=$1`, [String(failUser.user._id)]);
    assert.equal(failState.rows[0].role, "user");
    const failProfile = await query(`SELECT 1 FROM arc.editor_profiles WHERE user_id=$1`, [
      String(failUser.user._id),
    ]);
    assert.equal(failProfile.rowCount, 0);
    await query(
      `UPDATE arc.users SET extra = extra - 'pgitestTxFail' WHERE id=$1`,
      [String(failUser.user._id)]
    );
    await invalidateUserCache(String(failUser.user._id));

    const concurrentBecome = await Promise.all([
      request("POST", "/api/user/become-editor", {
        headers: authHeaders(userA.token, deviceId),
        body: onboardBody({ penName: "Arc Pen A" }),
      }),
      request("POST", "/api/user/become-editor", {
        headers: authHeaders(userA.token, deviceId),
        body: onboardBody({ penName: "Arc Pen A2" }),
      }),
    ]);
    for (const row of concurrentBecome) {
      assert.ok([200, 201].includes(row.status), row.raw);
      assert.equal(row.json.user.role, "editor");
      assert.ok(row.json.token);
    }
    const decoded = jwt.decode(concurrentBecome[0].json.token);
    assert.equal(decoded.role, "editor");
    const profileCount = await query(`SELECT count(*)::int AS n FROM arc.editor_profiles WHERE user_id=$1`, [
      String(userA.user._id),
    ]);
    assert.equal(profileCount.rows[0].n, 1);

    const afterUser = await query(`SELECT password_hash, is_vip, username, role FROM arc.users WHERE id=$1`, [
      String(userA.user._id),
    ]);
    assert.equal(afterUser.rows[0].password_hash, passwordHashBefore.hash);
    assert.equal(afterUser.rows[0].username, passwordHashBefore.username);
    assert.equal(afterUser.rows[0].is_vip, true);
    assert.equal(afterUser.rows[0].role, "editor");

    const editorToken = concurrentBecome[0].json.token;
    const created = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(editorToken, deviceId), "Idempotency-Key": `manhua-${onboardStamp}-1` },
      body: {
        title: `Pgitest SSE ${onboardStamp}`,
        slug: `pgitest-sse-${onboardStamp}`,
        createdBy: String(userB.user._id),
        owners: [String(userB.user._id)],
        userId: String(userB.user._id),
      },
    });
    assert.equal(created.status, 201, created.raw);
    ids.manhuas.push(String(created.json._id));
    await markPgitest("manhuas", created.json._id);
    const owned = await query(`SELECT created_by FROM arc.manhuas WHERE id=$1`, [String(created.json._id)]);
    assert.equal(String(owned.rows[0].created_by), String(userA.user._id));

    const slugTwo = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(editorToken, deviceId), "Idempotency-Key": `manhua-${onboardStamp}-slug2` },
      body: { title: `Pgitest SSE ${onboardStamp} copy`, slug: `pgitest-sse-${onboardStamp}` },
    });
    assert.ok([201, 409].includes(slugTwo.status), slugTwo.raw);
    if (slugTwo.status === 201) {
      ids.manhuas.push(String(slugTwo.json._id));
      await markPgitest("manhuas", slugTwo.json._id);
      assert.notEqual(slugTwo.json.slug, created.json.slug);
    }

    const similar = await request("GET", `/api/editor/manhuas/similar?title=${encodeURIComponent("Pgitest SSE")}`, {
      headers: authHeaders(editorToken, deviceId),
    });
    assert.equal(similar.status, 200, similar.raw);
    assert.ok(Array.isArray(similar.json.items));

    const becomeB = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(userB.token, deviceId),
      body: onboardBody({ penName: "Arc Pen B" }),
    });
    assert.ok([200, 201].includes(becomeB.status), becomeB.raw);
    const tokenB = becomeB.json.token;
    const steal = await request("PATCH", `/api/editor/manhuas/${created.json._id}`, {
      headers: authHeaders(tokenB, deviceId),
      body: { title: "stolen" },
    });
    assert.ok([403, 404].includes(steal.status), steal.raw);

    const foreignCover = await request("POST", "/api/editor/manhuas", {
      headers: authHeaders(tokenB, deviceId),
      body: {
        title: `Pgitest steal cover ${onboardStamp}`,
        slug: `pgitest-steal-${onboardStamp}`,
        coverImage: "https://cdn.example.com/someone-elses-cover.webp",
      },
    });
    assert.equal(foreignCover.status, 403, foreignCover.raw);

    const pageUrl = `https://cdn.example.com/pgitest-sse-${onboardStamp}.webp`;
    await query(
      `INSERT INTO arc.published_uploads (id, user_id, purpose, url, bytes, extra, created_at)
       VALUES ($1,$2,'chapter',$3,12,'{"pgitest":true}'::jsonb, now())`,
      [newId(), String(userA.user._id), pageUrl]
    );
    const ownChapter = await request("POST", `/api/editor/manhuas/${created.json.slug}/chapters`, {
      headers: authHeaders(editorToken, deviceId),
      body: {
        chapterNumber: 1,
        title: "one",
        status: "draft",
        pages: [{ imageUrl: pageUrl }],
      },
    });
    assert.equal(ownChapter.status, 201, ownChapter.raw);
    ids.chapters.push(String(ownChapter.json._id));
    await markPgitest("chapters", ownChapter.json._id);

    const stealChapter = await request("PUT", `/api/editor/chapters/${ownChapter.json._id}`, {
      headers: authHeaders(tokenB, deviceId),
      body: { title: "nope" },
    });
    assert.ok([403, 404].includes(stealChapter.status), stealChapter.raw);

    const stealPage = await request("POST", `/api/editor/manhuas/${created.json.slug}/chapters`, {
      headers: authHeaders(tokenB, deviceId),
      body: {
        chapterNumber: 2,
        title: "nope",
        pages: [{ imageUrl: pageUrl }],
      },
    });
    assert.ok([403, 404].includes(stealPage.status), stealPage.raw);

    const published = await request("PUT", `/api/editor/chapters/${ownChapter.json._id}`, {
      headers: authHeaders(editorToken, deviceId),
      body: { status: "published" },
    });
    assert.equal(published.status, 200, published.raw);

    const publicCh = await request(
      "GET",
      `/api/manhuas/${encodeURIComponent(created.json.slug)}/chapters/1`
    );
    assert.ok([200, 403, 401].includes(publicCh.status), publicCh.raw);

    const favAfter = await request("GET", "/api/me/favorites", {
      headers: authHeaders(editorToken, deviceId),
    });
    assert.equal(favAfter.status, 200, favAfter.raw);
    const favList = Array.isArray(favAfter.json) ? favAfter.json : favAfter.json.items || [];
    assert.ok(favList.length >= 1);

    const relogin = await request("POST", "/api/auth/login", {
      headers: { "x-device-id": deviceId },
      body: { identifier: userA.user.email, password },
    });
    assert.equal(relogin.status, 200, relogin.raw);
    assert.equal(relogin.json.user.role, "editor");

    const becomeQ = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(quotaUser.token, deviceId),
      body: onboardBody({ penName: "Quota Pen" }),
    });
    assert.ok([200, 201].includes(becomeQ.status), becomeQ.raw);
    const tokenQ = becomeQ.json.token;
    for (let i = 0; i < 5; i += 1) {
      const row = await request("POST", "/api/editor/manhuas", {
        headers: { ...authHeaders(tokenQ, deviceId), "Idempotency-Key": `q-manhua-${onboardStamp}-${i}` },
        body: { title: `Pgitest quota ${onboardStamp} ${i}`, slug: `pgitest-quota-${onboardStamp}-${i}` },
      });
      assert.equal(row.status, 201, row.raw);
      ids.manhuas.push(String(row.json._id));
      await markPgitest("manhuas", row.json._id);
    }
    const over = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(tokenQ, deviceId), "Idempotency-Key": `q-manhua-${onboardStamp}-over` },
      body: { title: `Pgitest quota over ${onboardStamp}`, slug: `pgitest-quota-${onboardStamp}-over` },
    });
    assert.equal(over.status, 429, over.raw);
    assert.equal(over.json.code, "SELF_SERVE_QUOTA");
    assert.match(over.json.message, /манхва/i);

    const replay = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(tokenQ, deviceId), "Idempotency-Key": `q-manhua-${onboardStamp}-0` },
      body: { title: `Pgitest quota ${onboardStamp} 0`, slug: `pgitest-quota-${onboardStamp}-0` },
    });
    assert.ok([200, 201].includes(replay.status), replay.raw);

    await query(
      `INSERT INTO arc.editor_quota_ledger
        (id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at)
       VALUES ($1,$2,'upload', 10, $3, 'reserved', now() - interval '2 hours', '{"pgitest":true}'::jsonb, now() - interval '3 hours', now())`,
      [newId(), String(quotaUser.user._id), `expired-${onboardStamp}`]
    );
    const expiredIgnored = await quota.reserveUpload({
      user: { _id: quotaUser.user._id, extra: { pgitest: true } },
      bytes: 2048,
      idempotencyKey: `staging/${quotaUser.user._id}/cover/${onboardStamp}-fresh`,
    });
    assert.equal(expiredIgnored.status, "reserved");
    await quota.releaseReservation({
      user: { _id: quotaUser.user._id },
      kind: "upload",
      idempotencyKey: `staging/${quotaUser.user._id}/cover/${onboardStamp}-fresh`,
    });

    const abortKey = `staging/${quotaUser.user._id}/cover/${onboardStamp}-abort`;
    await quota.reserveUpload({
      user: { _id: quotaUser.user._id, extra: { pgitest: true } },
      bytes: 4096,
      idempotencyKey: abortKey,
    });
    await quota.releaseReservation({
      user: { _id: quotaUser.user._id },
      kind: "upload",
      idempotencyKey: abortKey,
    });
    const afterAbort = await quota.reserveUpload({
      user: { _id: quotaUser.user._id, extra: { pgitest: true } },
      bytes: 4096,
      idempotencyKey: abortKey,
    });
    assert.equal(afterAbort.status, "reserved");
    await quota.releaseReservation({
      user: { _id: quotaUser.user._id },
      kind: "upload",
      idempotencyKey: abortKey,
    });

    await query(
      `INSERT INTO arc.editor_quota_ledger
        (id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at)
       VALUES ($1,$2,'upload', $3, $4, 'committed', now() + interval '1 day', '{"pgitest":true}'::jsonb, now(), now())`,
      [newId(), String(quotaUser.user._id), 500 * 1024 * 1024, `full-${onboardStamp}`]
    );
    await assert.rejects(
      () =>
        quota.reserveUpload({
          user: { _id: quotaUser.user._id, extra: { pgitest: true } },
          bytes: 1024,
          idempotencyKey: `staging/${quotaUser.user._id}/cover/${onboardStamp}-overbytes`,
        }),
      (err) => err && err.code === "SELF_SERVE_QUOTA"
    );

    const concurrentQuota = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        request("POST", "/api/editor/manhuas", {
          headers: {
            ...authHeaders(tokenQ, deviceId),
            "Idempotency-Key": `q-conc-${onboardStamp}-${i}`,
          },
          body: { title: `Pgitest conc ${onboardStamp} ${i}`, slug: `pgitest-qconc-${onboardStamp}-${i}` },
        })
      )
    );
    assert.ok(concurrentQuota.every((row) => row.status === 429));

    const translator = await makeStaff("translator", `pgitst_${onboardStamp}`);
    const translatorStay = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(translator.token, translator.deviceId),
      body: onboardBody(),
    });
    assert.equal(translatorStay.status, 403, translatorStay.raw);
    const trRole = await query(`SELECT role FROM arc.users WHERE id=$1`, [String(translator.user._id)]);
    assert.equal(trRole.rows[0].role, "translator");
  });
}
