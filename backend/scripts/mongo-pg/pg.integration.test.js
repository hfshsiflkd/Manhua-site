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
const { cleanupPgitestR2 } = require("./pgitestR2Cleanup");

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
    await applySqlFile(
      query,
      path.join(__dirname, "../../../supabase/migrations/20260923131500_self_serve_editor_grants.sql")
    );
    await applySqlFile(
      query,
      path.join(__dirname, "../../../supabase/migrations/20260923140000_creator_public_indexes.sql")
    );
    await applySqlFile(
      query,
      path.join(__dirname, "../../../supabase/migrations/20260923153000_team_recruitment.sql")
    );
    await applySqlFile(
      query,
      path.join(__dirname, "../../../supabase/migrations/20260923180000_self_serve_team_creation.sql")
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
      try {
        const { r2Client } = require("../../src/config/r2");
        const r2Report = await cleanupPgitestR2(query, {
          r2Client,
          bucket: process.env.R2_BUCKET_NAME,
        });
        console.log(JSON.stringify({ pgitestR2Cleanup: { deleted: r2Report.deleted, listed: r2Report.listed, users: r2Report.users } }));
      } catch (err) {
        console.log(JSON.stringify({ pgitestR2Cleanup: { error: String(err.message || err) } }));
      }
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
      headers: authHeaders(ctx.secondToken, ctx.trialDevice),
      body: { name: `pgitest-team-${stamp}` },
    });
    assert.ok([401, 403].includes(teamCreateDenied.status));

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

    const randomLegacy = await request("POST", `/api/editor/manhuas/${created.json.slug}/chapters`, {
      headers: authHeaders(editorToken, deviceId),
      body: {
        chapterNumber: 9,
        title: "random",
        pages: [{ imageUrl: `https://cdn.example.com/pgitest-untracked-${onboardStamp}.webp` }],
      },
    });
    assert.equal(randomLegacy.status, 403, randomLegacy.raw);
    assert.equal(randomLegacy.json.code, "UPLOAD_OWNERSHIP");

    const legacyCover = `https://cdn.example.com/pgitest-legacy-cover-${onboardStamp}.webp`;
    await query(`UPDATE arc.manhuas SET cover_image=$2, cover_image_url=$2 WHERE id=$1`, [
      String(created.json._id),
      legacyCover,
    ]);
    const keepLegacyCover = await request("PATCH", `/api/editor/manhuas/${created.json._id}`, {
      headers: authHeaders(editorToken, deviceId),
      body: { title: `Pgitest SSE ${onboardStamp} kept`, coverImage: legacyCover, coverImageUrl: legacyCover },
    });
    assert.equal(keepLegacyCover.status, 200, keepLegacyCover.raw);

    const legacyPage = `https://cdn.example.com/pgitest-legacy-page-${onboardStamp}.webp`;
    await query(
      `INSERT INTO arc.chapter_pages (chapter_id, page_number, image_url, extra)
       VALUES ($1,2,$2,'{"pgitest":true}'::jsonb)
       ON CONFLICT (chapter_id, page_number) DO UPDATE SET image_url = EXCLUDED.image_url`,
      [String(ownChapter.json._id), legacyPage]
    );
    const reorderLegacy = await request("PUT", `/api/editor/chapters/${ownChapter.json._id}`, {
      headers: authHeaders(editorToken, deviceId),
      body: {
        status: "draft",
        pages: [{ imageUrl: pageUrl, pageNumber: 2 }, { imageUrl: legacyPage, pageNumber: 1 }],
      },
    });
    assert.equal(reorderLegacy.status, 200, reorderLegacy.raw);
    const publishLegacy = await request("PUT", `/api/editor/chapters/${ownChapter.json._id}`, {
      headers: authHeaders(editorToken, deviceId),
      body: { status: "published" },
    });
    assert.equal(publishLegacy.status, 200, publishLegacy.raw);

    const teamRes = await request("POST", "/api/editor/teams", {
      headers: authHeaders(adminActor.token, deviceId),
      body: { name: `pgitest-sse-team-${onboardStamp}` },
    });
    assert.equal(teamRes.status, 201, teamRes.raw);
    ids.teams.push(String(teamRes.json._id));
    await markPgitest("teams", teamRes.json._id);
    const inviteA = await request("POST", `/api/editor/teams/${teamRes.json._id}/members`, {
      headers: authHeaders(adminActor.token, deviceId),
      body: { userId: String(userA.user._id), role: "editor" },
    });
    assert.equal(inviteA.status, 200, inviteA.raw);
    await request("POST", `/api/me/team-invites/${inviteA.json.invite._id || inviteA.json.invite.id}/accept`, {
      headers: authHeaders(editorToken, deviceId),
    });
    const inviteB = await request("POST", `/api/editor/teams/${teamRes.json._id}/members`, {
      headers: authHeaders(adminActor.token, deviceId),
      body: { userId: String(userB.user._id), role: "editor" },
    });
    assert.equal(inviteB.status, 200, inviteB.raw);
    await request("POST", `/api/me/team-invites/${inviteB.json.invite._id || inviteB.json.invite.id}/accept`, {
      headers: authHeaders(tokenB, deviceId),
    });

    const teamManhua = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(editorToken, deviceId), "Idempotency-Key": `team-m-${onboardStamp}` },
      body: {
        title: `Pgitest team ${onboardStamp}`,
        slug: `pgitest-team-${onboardStamp}`,
        teamId: teamRes.json._id,
      },
    });
    assert.equal(teamManhua.status, 201, teamManhua.raw);
    ids.manhuas.push(String(teamManhua.json._id));
    await markPgitest("manhuas", teamManhua.json._id);

    const teammatePage = `https://cdn.example.com/pgitest-team-page-${onboardStamp}.webp`;
    await query(
      `INSERT INTO arc.published_uploads (id, user_id, purpose, url, bytes, extra, created_at)
       VALUES ($1,$2,'chapter',$3,24,'{"pgitest":true}'::jsonb, now())`,
      [newId(), String(userA.user._id), teammatePage]
    );
    const teamChapter = await request("POST", `/api/editor/manhuas/${teamManhua.json.slug}/chapters`, {
      headers: authHeaders(editorToken, deviceId),
      body: {
        chapterNumber: 1,
        title: "team ch",
        status: "draft",
        pages: [{ imageUrl: teammatePage }],
      },
    });
    assert.equal(teamChapter.status, 201, teamChapter.raw);
    ids.chapters.push(String(teamChapter.json._id));
    await markPgitest("chapters", teamChapter.json._id);

    const teammateEdit = await request("PUT", `/api/editor/chapters/${teamChapter.json._id}`, {
      headers: authHeaders(tokenB, deviceId),
      body: {
        status: "published",
        pages: [{ imageUrl: teammatePage, pageNumber: 1 }],
      },
    });
    assert.equal(teammateEdit.status, 200, teammateEdit.raw);

    const teammateReuse = await request("POST", `/api/editor/manhuas/${teamManhua.json.slug}/chapters`, {
      headers: authHeaders(tokenB, deviceId),
      body: {
        chapterNumber: 2,
        title: "from teammate upload",
        pages: [{ imageUrl: teammatePage }],
      },
    });
    assert.equal(teammateReuse.status, 201, teammateReuse.raw);
    ids.chapters.push(String(teammateReuse.json._id));
    await markPgitest("chapters", teammateReuse.json._id);

    const grants = await query(`
      SELECT count(*)::int AS n
      FROM information_schema.role_table_grants
      WHERE table_schema='arc'
        AND table_name IN ('editor_profiles','published_uploads','editor_quota_ledger')
        AND grantee IN ('PUBLIC','anon','authenticated')
    `);
    assert.equal(grants.rows[0].n, 0);
    const rls = await query(`
      SELECT bool_or(c.relrowsecurity) AS any_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='arc'
        AND c.relname IN ('editor_profiles','published_uploads','editor_quota_ledger')
    `);
    assert.equal(rls.rows[0].any_rls, false);
    const trgm = await query(`SELECT 1 FROM pg_extension WHERE extname='pg_trgm'`);
    assert.equal(trgm.rowCount, 1);
    const legacyRole = await query(`SELECT role FROM arc.users WHERE id=$1`, [String(ctx.editor._id)]);
    assert.equal(legacyRole.rows[0].role, "editor");

    const prevSignup = process.env.SELF_SERVE_EDITOR_SIGNUP;
    process.env.SELF_SERVE_EDITOR_SIGNUP = "false";
    try {
      const closedUser = await makeUser(`pgitse_${onboardStamp}c`);
      const closed = await request("POST", "/api/user/become-editor", {
        headers: authHeaders(closedUser.token, deviceId),
        body: onboardBody({ penName: "Closed Pen" }),
      });
      assert.equal(closed.status, 403, closed.raw);
      assert.equal(closed.json.code, "SELF_SERVE_SIGNUP_DISABLED");
      const closedRole = await query(`SELECT role FROM arc.users WHERE id=$1`, [String(closedUser.user._id)]);
      assert.equal(closedRole.rows[0].role, "user");
      const metaClosed = await request("GET", "/api/user/editor-onboarding", {
        headers: authHeaders(closedUser.token, deviceId),
      });
      assert.equal(metaClosed.status, 200, metaClosed.raw);
      assert.equal(metaClosed.json.signupEnabled, false);
      assert.equal(metaClosed.json.eligible, false);
      const stillEditor = await request("POST", "/api/user/become-editor", {
        headers: authHeaders(editorToken, deviceId),
        body: onboardBody({ penName: "Arc Pen A" }),
      });
      assert.ok([200, 201].includes(stillEditor.status), stillEditor.raw);
      const keepCreate = await request("POST", "/api/editor/manhuas", {
        headers: { ...authHeaders(editorToken, deviceId), "Idempotency-Key": `flag-keep-${onboardStamp}` },
        body: { title: `Pgitest keep ${onboardStamp}`, slug: `pgitest-keep-${onboardStamp}` },
      });
      assert.equal(keepCreate.status, 201, keepCreate.raw);
      ids.manhuas.push(String(keepCreate.json._id));
      await markPgitest("manhuas", keepCreate.json._id);
    } finally {
      if (prevSignup == null) delete process.env.SELF_SERVE_EDITOR_SIGNUP;
      else process.env.SELF_SERVE_EDITOR_SIGNUP = prevSignup;
    }

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

    const prevSignupQuota = process.env.SELF_SERVE_EDITOR_SIGNUP;
    process.env.SELF_SERVE_EDITOR_SIGNUP = "false";
    try {
      const quotaWhileClosed = await request("POST", "/api/editor/manhuas", {
        headers: { ...authHeaders(tokenQ, deviceId), "Idempotency-Key": `q-manhua-${onboardStamp}-flag` },
        body: { title: `Pgitest flag quota ${onboardStamp}`, slug: `pgitest-qflag-${onboardStamp}` },
      });
      assert.equal(quotaWhileClosed.status, 429, quotaWhileClosed.raw);
    } finally {
      if (prevSignupQuota == null) delete process.env.SELF_SERVE_EDITOR_SIGNUP;
      else process.env.SELF_SERVE_EDITOR_SIGNUP = prevSignupQuota;
    }

    const translator = await makeStaff("translator", `pgitst_${onboardStamp}`);
    const translatorStay = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(translator.token, translator.deviceId),
      body: onboardBody(),
    });
    assert.equal(translatorStay.status, 403, translatorStay.raw);
    const trRole = await query(`SELECT role FROM arc.users WHERE id=$1`, [String(translator.user._id)]);
    assert.equal(trRole.rows[0].role, "translator");
  });

  test("public creator profile and manhua credits", async () => {
    const crypto = require("crypto");
    const { creditForManhua, PRIVATE_KEYS } = require("../../src/services/creatorProfileService");
    const deviceId = `pgitest-dev-${stamp}-creator`;
    const onboardStamp = `c${stamp}`;

    function hexId() {
      return crypto.randomBytes(12).toString("hex");
    }

    function denyPrivate(obj) {
      const blob = JSON.stringify(obj);
      const lower = blob.toLowerCase();
      for (const key of PRIVATE_KEYS) {
        assert.equal(Object.prototype.hasOwnProperty.call(obj, key), false, `leaked ${key}`);
      }
      assert.equal(lower.includes("@pgitest.local"), false);
      assert.equal(lower.includes("password_hash"), false);
      assert.equal(lower.includes("jwt"), false);
      assert.equal(lower.includes("device_id"), false);
      assert.equal(lower.includes("self_serve"), false);
      assert.equal(lower.includes("terms_accepted"), false);
    }

    async function insertManhua({ creatorId, slug, title, deletedAt = null, extra = { pgitest: true }, teamId = null, published = true }) {
      const manhuaId = hexId();
      ids.manhuas.push(manhuaId);
      await query(
        `INSERT INTO arc.manhuas (
           id, title, slug, rating, status, created_by, team_id, views, weekly_views, deleted_at, extra, created_at, updated_at
         ) VALUES ($1,$2,$3,0,'ongoing',$4,$5,0,0,$6,$7::jsonb, now(), now())`,
        [manhuaId, title, slug, creatorId, teamId, deletedAt, JSON.stringify(extra)]
      );
      const chapterId = hexId();
      ids.chapters.push(chapterId);
      await query(
        `INSERT INTO arc.chapters (
           id, manhua_id, chapter_number, title, language, status, views, extra, created_at, updated_at
         ) VALUES ($1,$2,1,$3,'mn',$4,0,'{"pgitest":true}'::jsonb, now(), now())`,
        [chapterId, manhuaId, `${title} ch`, published ? "published" : "draft"]
      );
      return { manhuaId, chapterId, slug };
    }

    const onboarded = await User.create({
      username: `pgitcr_${onboardStamp}`,
      email: `pgitcr_${onboardStamp}@pgitest.local`,
      password,
      role: "user",
      sessionToken: genSessionToken(),
      deviceId,
      lastDeviceId: deviceId,
      extra: { pgitest: true },
    });
    ids.users.push(String(onboarded._id));
    const onboardToken = genJwt(onboarded);
    const become = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(onboardToken, deviceId),
      body: {
        penName: "Arc Public Pen",
        bio: "Энэ бол хангалттай урт танилцуулга текст юм.",
        skills: ["translation"],
        experience: "beginner",
        languages: ["mn"],
        portfolioUrl: "https://example.com/portfolio",
        acceptTerms: true,
        role: "admin",
        self_serve: false,
      },
    });
    assert.ok([200, 201].includes(become.status), become.raw);
    const editorId = String(onboarded._id);
    const editorToken = become.json.token;

    const published = await insertManhua({
      creatorId: editorId,
      slug: `pgitest-pub-${onboardStamp}`,
      title: `Pgitest pub ${onboardStamp}`,
    });
    await query(`INSERT INTO arc.manhua_owners (manhua_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
      published.manhuaId,
      editorId,
    ]);
    const ownerB = await makeStaff("editor", `pgitown_${onboardStamp}`);
    await query(`INSERT INTO arc.manhua_owners (manhua_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
      published.manhuaId,
      String(ownerB.user._id),
    ]);

    const draftOnly = await insertManhua({
      creatorId: editorId,
      slug: `pgitest-draft-${onboardStamp}`,
      title: `Pgitest draft ${onboardStamp}`,
      published: false,
    });
    const deleted = await insertManhua({
      creatorId: editorId,
      slug: `pgitest-del-${onboardStamp}`,
      title: `Pgitest del ${onboardStamp}`,
      deletedAt: new Date(),
    });
    const placeholder = await insertManhua({
      creatorId: editorId,
      slug: `pgitest-ph-${onboardStamp}`,
      title: `Pgitest ph ${onboardStamp}`,
      extra: { pgitest: true, quarantinePlaceholder: true },
    });

    const publicProfile = await request("GET", `/api/creators/${editorId}`);
    assert.equal(publicProfile.status, 200, publicProfile.raw);
    denyPrivate(publicProfile.json);
    assert.equal(publicProfile.json.displayName, "Arc Public Pen");
    assert.equal(publicProfile.json.portfolioUrl, "https://example.com/portfolio");
    assert.equal(publicProfile.json.publishedCount, 1);
    assert.equal(publicProfile.json.manhuas.length, 1);
    assert.equal(publicProfile.json.manhuas[0].slug, published.slug);
    const listed = JSON.stringify(publicProfile.json);
    assert.equal(listed.includes(draftOnly.slug), false);
    assert.equal(listed.includes(deleted.slug), false);
    assert.equal(listed.includes(placeholder.slug), false);
    assert.equal(listed.includes("pages"), false);

    const page2 = await request("GET", `/api/creators/${editorId}?page=1&limit=1`);
    assert.equal(page2.json.manhuas.length, 1);
    assert.equal(page2.json.publishedCount, 1);

    const unauth = await request("GET", `/api/creators/${editorId}`);
    assert.equal(unauth.status, 200);

    const legacy = await makeStaff("editor", `pgitleg_${onboardStamp}`);
    const legacyPub = await insertManhua({
      creatorId: String(legacy.user._id),
      slug: `pgitest-legacy-pub-${onboardStamp}`,
      title: `Pgitest legacy pub ${onboardStamp}`,
    });
    const legacyPublic = await request("GET", `/api/creators/${legacy.user._id}`);
    assert.equal(legacyPublic.status, 200, legacyPublic.raw);
    denyPrivate(legacyPublic.json);
    assert.equal(legacyPublic.json.displayName, legacy.user.username);
    assert.equal(legacyPublic.json.bio, null);
    assert.equal(legacyPublic.json.publishedCount, 1);
    assert.equal(legacyPublic.json.manhuas[0].slug, legacyPub.slug);

    const regular = await User.create({
      username: `pgitreg_${onboardStamp}`,
      email: `pgitreg_${onboardStamp}@pgitest.local`,
      password,
      role: "user",
      sessionToken: genSessionToken(),
      deviceId: `${deviceId}-reg`,
      lastDeviceId: `${deviceId}-reg`,
      extra: { pgitest: true },
    });
    ids.users.push(String(regular._id));
    const missing = await request("GET", `/api/creators/${regular._id}`);
    assert.equal(missing.status, 404);

    await query(`UPDATE arc.users SET blocked=true WHERE id=$1`, [editorId]);
    const blockedGet = await request("GET", `/api/creators/${editorId}`);
    assert.equal(blockedGet.status, 404);
    await query(`UPDATE arc.users SET blocked=false, is_active=true WHERE id=$1`, [editorId]);

    const otherPatch = await request("PATCH", "/api/user/creator-profile", {
      headers: authHeaders(ownerB.token, ownerB.deviceId),
      body: { penName: "Hijack", bio: "Энэ бол хангалттай урт танилцуулга текст юм.", skills: ["cleanup"], languages: ["en"] },
    });
    assert.equal(otherPatch.status, 200, otherPatch.raw);
    const still = await request("GET", `/api/creators/${editorId}`);
    assert.equal(still.json.displayName, "Arc Public Pen");

    const asRegular = await request("PATCH", "/api/user/creator-profile", {
      headers: authHeaders(genJwt(regular), `${deviceId}-reg`),
      body: { penName: "Nope", bio: "Энэ бол хангалттай урт танилцуулга текст юм.", skills: ["cleanup"], languages: ["en"] },
    });
    assert.equal(asRegular.status, 403);

    const xss = await request("PATCH", "/api/user/creator-profile", {
      headers: authHeaders(editorToken, deviceId),
      body: {
        penName: "<script>alert(1)</script>",
        bio: "Энэ бол хангалттай урт танилцуулга текст юм.",
        skills: ["translation"],
        languages: ["mn"],
        portfolioUrl: "javascript:alert(1)",
        role: "admin",
        self_serve: true,
        userId: String(ownerB.user._id),
      },
    });
    assert.equal(xss.status, 400, xss.raw);
    assert.ok(xss.json.fields.portfolioUrl);

    const storedXss = await request("PATCH", "/api/user/creator-profile", {
      headers: authHeaders(editorToken, deviceId),
      body: {
        penName: "<b>bold</b>",
        bio: "Энэ бол хангалттай урт танилцуулга текст юм.",
        skills: ["translation"],
        languages: ["mn"],
        portfolioUrl: "https://example.com/x",
      },
    });
    assert.equal(storedXss.status, 200, storedXss.raw);
    const xssPublic = await request("GET", `/api/creators/${editorId}`);
    assert.equal(xssPublic.json.displayName, "<b>bold</b>");

    const okPatch = await request("PATCH", "/api/user/creator-profile", {
      headers: authHeaders(editorToken, deviceId),
      body: {
        penName: "Шинэ нэр",
        bio: "Энэ бол хангалттай урт танилцуулга текст юм.",
        skills: ["cleanup", "translation"],
        languages: ["mn", "en"],
        portfolioUrl: "https://example.com/new",
        role: "admin",
        self_serve: true,
        quota: 99,
      },
    });
    assert.equal(okPatch.status, 200, okPatch.raw);
    denyPrivate(okPatch.json.profile);
    assert.equal(okPatch.json.profile.penName, "Шинэ нэр");
    assert.equal(okPatch.json.profile.hasProfile, true);
    assert.match(okPatch.json.profile.publicUrl, /^https:\/\/www\.arc-read\.com\/creators\//);
    assert.equal(okPatch.json.profile.publicUrl.includes("localhost"), false);

    const afterRole = await query(`SELECT role FROM arc.users WHERE id=$1`, [editorId]);
    assert.equal(afterRole.rows[0].role, "editor");
    const afterServe = await query(`SELECT self_serve FROM arc.editor_profiles WHERE user_id=$1`, [editorId]);
    assert.equal(afterServe.rows[0].self_serve, true);

    const refreshed = await request("GET", `/api/creators/${editorId}`);
    assert.equal(refreshed.json.displayName, "Шинэ нэр");

    const detail = await request("GET", `/api/manhuas/${published.slug}`);
    assert.equal(detail.status, 200, detail.raw);
    assert.equal(detail.json.credit.publisher.displayName, "Шинэ нэр");
    assert.equal(detail.json.credit.publisher.href, `/creators/${editorId}`);
    assert.equal(JSON.stringify(detail.json.chapters || []).includes("imageUrl"), false);
    assert.equal(JSON.stringify(detail.json).includes("@pgitest.local"), false);

    const teamId = hexId();
    ids.teams.push(teamId);
    await query(
      `INSERT INTO arc.teams (id, name, description, created_by, extra, created_at, updated_at)
       VALUES ($1,$2,'test',$3,'{"pgitest":true}'::jsonb, now(), now())`,
      [teamId, `pgitest-team-${onboardStamp}`, editorId]
    );
    await query(`UPDATE arc.manhuas SET team_id=$1 WHERE id=$2`, [teamId, published.manhuaId]);
    const redisCache = require("../../src/cache/redisCache");
    await redisCache.del(`manhua:slug:${published.slug}`);
    const withTeam = await request("GET", `/api/manhuas/${published.slug}`);
    assert.equal(withTeam.json.credit.team.name, `pgitest-team-${onboardStamp}`);
    assert.equal(withTeam.json.credit.team.href, null);

    const missingCredit = await creditForManhua({
      createdBy: "000000000000000000000000",
      team: "111111111111111111111111",
    });
    assert.equal(missingCredit.publisher.displayName, "Үл мэдэгдэх");
    assert.equal(missingCredit.publisher.href, null);
    assert.equal(missingCredit.team, null);

    const legacyPatch = await request("PATCH", "/api/user/creator-profile", {
      headers: authHeaders(legacy.token, legacy.deviceId),
      body: {
        penName: "Legacy Pen",
        bio: "Энэ бол хангалттай урт танилцуулга текст юм.",
        skills: ["proofreading"],
        languages: ["ko"],
      },
    });
    assert.equal(legacyPatch.status, 200, legacyPatch.raw);
    const legacyFlags = await query(`SELECT self_serve, terms_version FROM arc.editor_profiles WHERE user_id=$1`, [
      String(legacy.user._id),
    ]);
    assert.equal(legacyFlags.rows[0].self_serve, false);
    assert.equal(legacyFlags.rows[0].terms_version, "legacy-profile");
  });

  test("team recruitment listings, applications, membership, freeze", async () => {
    const admin = await makeStaff("admin", `pgitr_a_${stamp}`);
    const editor = await makeStaff("editor", `pgitr_e_${stamp}`);
    const teamRes = await request("POST", "/api/editor/teams", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { name: `pgitest-recruit-${stamp}` },
    });
    assert.equal(teamRes.status, 201, teamRes.raw);
    const teamId = String(teamRes.json._id);
    ids.teams.push(teamId);
    await markPgitest("teams", teamId);

    const outsiderListing = await request("POST", "/api/recruitment", {
      headers: authHeaders(editor.token, editor.deviceId),
      body: {
        title: "Хүн хайж байна үү",
        teamId,
        workRole: "translation",
        description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
        languages: ["mn"],
        compensation: "volunteer",
        expiresInDays: 30,
      },
    });
    assert.equal(outsiderListing.status, 403, outsiderListing.raw);

    const listing = await request("POST", "/api/recruitment", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: {
        title: "Орчуулагч хайж байна",
        teamId,
        workRole: "translation",
        description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
        languages: ["mn"],
        compensation: "volunteer",
        expiresInDays: 30,
        status: "open",
      },
    });
    assert.equal(listing.status, 201, listing.raw);
    const listingId = listing.json.id;
    assert.equal(listing.json.compensationDisclaimer.includes("баг"), true);
    assert.equal(Object.prototype.hasOwnProperty.call(listing.json, "email"), false);

    const publicList = await request("GET", "/api/recruitment?page=1&limit=12");
    assert.equal(publicList.status, 200);
    assert.ok(publicList.json.items.some((item) => item.id === listingId));
    const leaked = JSON.stringify(publicList.json);
    assert.equal(/@pgitest\.local|"email"|"deviceId"|"isVIP"/.test(leaked), false);

    const applicant = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": `pgitest-dev-${stamp}-rec` },
      body: {
        username: `pgitr_u_${stamp}`,
        email: `pgitr_u_${stamp}@pgitest.local`,
        password,
        deviceId: `pgitest-dev-${stamp}-rec`,
      },
    });
    assert.equal(applicant.status, 200, applicant.raw);
    const appToken = applicant.json.token;
    const appUserId = applicant.json.user._id;
    ids.users.push(String(appUserId));

    const unauthApply = await request("POST", `/api/recruitment/${listingId}/applications`, {
      body: { intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.", experience: "beginner", weeklyHoursNote: "10 цаг", acceptJoin: true },
    });
    assert.equal(unauthApply.status, 401);

    const apply = await request("POST", `/api/recruitment/${listingId}/applications`, {
      headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`),
      body: {
        intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.",
        experience: "beginner",
        weeklyHoursNote: "10 цаг",
        acceptJoin: true,
        email: "hidden@pgitest.local",
        role: "admin",
      },
    });
    assert.equal(apply.status, 201, apply.raw);
    const applicationId = apply.json.id;
    assert.equal(apply.json.status, "pending");
    assert.equal(apply.json.email, undefined);

    const dup = await Promise.all([
      request("POST", `/api/recruitment/${listingId}/applications`, {
        headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`),
        body: { intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.", experience: "beginner", weeklyHoursNote: "10 цаг", acceptJoin: true },
      }),
      request("POST", `/api/recruitment/${listingId}/applications`, {
        headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`),
        body: { intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.", experience: "beginner", weeklyHoursNote: "10 цаг", acceptJoin: true },
      }),
    ]);
    assert.ok(dup.every((r) => r.status === 409 || r.status === 400));

    const editorApply = await request("POST", `/api/recruitment/${listingId}/applications`, {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.", experience: "experienced", weeklyHoursNote: "5 цаг", acceptJoin: true },
    });
    assert.equal(editorApply.status, 400);

    const wsBefore = await request("GET", "/api/user/workspace", { headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`) });
    assert.equal(wsBefore.json.teamMember, false);
    assert.equal(wsBefore.json.canPublishManhua, false);

    const mineDenied = await request("GET", "/api/editor/manhuas/mine", { headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`) });
    assert.equal(mineDenied.status, 403);

    const rejectOther = await request("POST", `/api/recruitment/applications/${applicationId}/decision`, {
      headers: authHeaders(editor.token, editor.deviceId),
      body: { action: "reject", decisionNote: "Багтаа тохирохгүй" },
    });
    assert.equal(rejectOther.status, 403);

    const acceptA = request("POST", `/api/recruitment/applications/${applicationId}/decision`, {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { action: "accept" },
    });
    const acceptB = request("POST", `/api/recruitment/applications/${applicationId}/decision`, {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { action: "reject", decisionNote: "Давхар оролдлого" },
    });
    const concurrent = await Promise.all([acceptA, acceptB]);
    const accepted = concurrent.filter((r) => r.status === 200 && r.json.status === "accepted");
    const conflicted = concurrent.filter((r) => r.status === 409 || (r.status === 200 && r.json.status === "rejected") || r.status >= 400);
    assert.equal(accepted.length, 1, JSON.stringify(concurrent.map((r) => ({ status: r.status, json: r.json }))));
    assert.equal(conflicted.length, 1);

    const members = await query(`SELECT role FROM arc.team_members WHERE team_id=$1 AND user_id=$2`, [teamId, String(appUserId)]);
    assert.equal(members.rowCount, 1);
    assert.equal(members.rows[0].role, "editor");
    const roleRow = await query(`SELECT role FROM arc.users WHERE id=$1`, [String(appUserId)]);
    assert.equal(roleRow.rows[0].role, "user");

    const wsAfter = await request("GET", "/api/user/workspace", { headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`) });
    assert.equal(wsAfter.json.teamMember, true);
    assert.equal(wsAfter.json.canPublishManhua, false);

    const mineOk = await request("GET", "/api/editor/manhuas/mine", { headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`) });
    assert.equal(mineOk.status, 200, mineOk.raw);

    const createDenied = await request("POST", "/api/editor/manhuas", {
      headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`),
      body: { title: "quota bypass" },
    });
    assert.ok([401, 403].includes(createDenied.status));

    const myApps = await request("GET", "/api/user/recruitment-applications", { headers: authHeaders(appToken, `pgitest-dev-${stamp}-rec`) });
    assert.equal(myApps.status, 200);
    assert.equal(myApps.json.items[0].status, "accepted");
    assert.equal(myApps.json.items[0].email, undefined);

    const closed = await request("PATCH", `/api/recruitment/manage/${listingId}`, {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { status: "closed" },
    });
    assert.equal(closed.status, 200, closed.raw);
    const publicClosed = await request("GET", `/api/recruitment/${listingId}`);
    assert.equal(publicClosed.json.closed, true);
    assert.equal(publicClosed.json.accepting, false);

    const applicant2 = await makeStaff("user", `pgitr_w_${stamp}`);
    const listing2 = await request("POST", "/api/recruitment", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: {
        title: "Цэвэрлэгч хайж байна",
        teamId,
        workRole: "cleanup",
        description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
        languages: ["mn"],
        compensation: "negotiable",
        compensationNote: "Цалин тохиролцоно",
        expiresInDays: 30,
      },
    });
    assert.equal(listing2.status, 201, listing2.raw);
    const apply2 = await request("POST", `/api/recruitment/${listing2.json.id}/applications`, {
      headers: authHeaders(applicant2.token, applicant2.deviceId),
      body: { intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.", experience: "experienced", weeklyHoursNote: "8 цаг", acceptJoin: true },
    });
    assert.equal(apply2.status, 201, apply2.raw);
    const withdraw = await request("POST", `/api/recruitment/applications/${apply2.json.id}/withdraw`, {
      headers: authHeaders(applicant2.token, applicant2.deviceId),
    });
    assert.equal(withdraw.status, 200, withdraw.raw);
    const reapply = await request("POST", `/api/recruitment/${listing2.json.id}/applications`, {
      headers: authHeaders(applicant2.token, applicant2.deviceId),
      body: { intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.", experience: "experienced", weeklyHoursNote: "8 цаг", acceptJoin: true },
    });
    assert.equal(reapply.status, 409);

    await query(`UPDATE arc.team_recruitment_listings SET expires_at=now() - interval '1 hour' WHERE id=$1`, [listing2.json.id]);
    const applicant3 = await makeStaff("user", `pgitr_x_${stamp}`);
    const expiredApply = await request("POST", `/api/recruitment/${listing2.json.id}/applications`, {
      headers: authHeaders(applicant3.token, applicant3.deviceId),
      body: { intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.", experience: "beginner", weeklyHoursNote: "4 цаг", acceptJoin: true },
    });
    assert.ok([400, 404].includes(expiredApply.status));

    const prevFreeze = process.env.API_READ_ONLY;
    process.env.API_READ_ONLY = "true";
    const frozen = await request("POST", "/api/recruitment", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: {
        title: "Freeze зар нэр энд",
        teamId,
        workRole: "proofreading",
        description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
        languages: ["mn"],
        compensation: "volunteer",
      },
    });
    if (prevFreeze == null) delete process.env.API_READ_ONLY;
    else process.env.API_READ_ONLY = prevFreeze;
    assert.equal(frozen.status, 503, frozen.raw);
    assert.equal(frozen.json.code, "READ_ONLY");
  });

  test("team-only member scoped upload, quota, removal, invite overlap", async () => {
    const https = require("https");
    const sharp = require("sharp");
    const { newId } = require("../../src/store/pg/helpers");
    const { UPLOAD_BYTES_PER_DAY, formatBytesMn: fmt } = (() => {
      const cfg = require("../../src/config/selfServeEditor");
      const quota = require("../../src/services/editorQuotaService");
      return { UPLOAD_BYTES_PER_DAY: cfg.UPLOAD_BYTES_PER_DAY, formatBytesMn: quota.formatBytesMn };
    })();
    const applyBody = {
      intro: "Би нэгдэх хүсэлтэй учир энэ танилцуулгыг бичиж байна.",
      experience: "beginner",
      weeklyHoursNote: "10 цаг",
      acceptJoin: true,
    };
    const listingBody = (title, teamId) => ({
      title,
      teamId,
      workRole: "translation",
      description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
      languages: ["mn"],
      compensation: "volunteer",
      expiresInDays: 30,
      status: "open",
    });

    function putBytes(url, body, headers = {}) {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const lib = u.protocol === "https:" ? https : http;
        const req = lib.request(
          url,
          { method: "PUT", headers: { ...headers, "Content-Length": String(body.length) } },
          (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode));
          }
        );
        req.on("error", reject);
        req.write(body);
        req.end();
      });
    }

    const admin = await makeStaff("admin", `pgitu_a_${stamp}`);
    const otherEditor = await makeStaff("editor", `pgitu_e_${stamp}`);
    const teamRes = await request("POST", "/api/editor/teams", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { name: `pgitest-upload-${stamp}` },
    });
    assert.equal(teamRes.status, 201, teamRes.raw);
    const teamId = String(teamRes.json._id);
    ids.teams.push(teamId);
    await markPgitest("teams", teamId);

    const otherTeam = await request("POST", "/api/editor/teams", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { name: `pgitest-upload-other-${stamp}` },
    });
    assert.equal(otherTeam.status, 201, otherTeam.raw);
    ids.teams.push(String(otherTeam.json._id));
    await markPgitest("teams", otherTeam.json._id);

    const teamManhua = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(admin.token, admin.deviceId), "Idempotency-Key": `tu-m-${stamp}` },
      body: { title: `Pgitest team-only ${stamp}`, slug: `pgitest-team-only-${stamp}`, teamId },
    });
    assert.equal(teamManhua.status, 201, teamManhua.raw);
    ids.manhuas.push(String(teamManhua.json._id));
    await markPgitest("manhuas", teamManhua.json._id);

    const otherManhua = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(admin.token, admin.deviceId), "Idempotency-Key": `tu-o-${stamp}` },
      body: {
        title: `Pgitest other-team ${stamp}`,
        slug: `pgitest-other-team-${stamp}`,
        teamId: otherTeam.json._id,
      },
    });
    assert.equal(otherManhua.status, 201, otherManhua.raw);
    ids.manhuas.push(String(otherManhua.json._id));
    await markPgitest("manhuas", otherManhua.json._id);

    const listing = await request("POST", "/api/recruitment", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: listingBody("Upload tester хайж байна", teamId),
    });
    assert.equal(listing.status, 201, listing.raw);
    const applicant = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": `pgitest-dev-${stamp}-up` },
      body: {
        username: `pgitu_u_${stamp}`,
        email: `pgitu_u_${stamp}@pgitest.local`,
        password,
        deviceId: `pgitest-dev-${stamp}-up`,
      },
    });
    assert.equal(applicant.status, 200, applicant.raw);
    const appToken = applicant.json.token;
    const appUserId = String(applicant.json.user._id);
    const appDevice = `pgitest-dev-${stamp}-up`;
    ids.users.push(appUserId);

    const apply = await request("POST", `/api/recruitment/${listing.json.id}/applications`, {
      headers: authHeaders(appToken, appDevice),
      body: applyBody,
    });
    assert.equal(apply.status, 201, apply.raw);
    const accepted = await request("POST", `/api/recruitment/applications/${apply.json.id}/decision`, {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { action: "accept" },
    });
    assert.equal(accepted.status, 200, accepted.raw);
    const roleRow = await query(`SELECT role FROM arc.users WHERE id=$1`, [appUserId]);
    assert.equal(roleRow.rows[0].role, "user");
    const ws = await request("GET", "/api/user/workspace", { headers: authHeaders(appToken, appDevice) });
    assert.equal(ws.json.teamMember, true);
    assert.equal(ws.json.canPublishManhua, false);

    const noScope = await request("POST", "/api/upload/presign", {
      headers: authHeaders(appToken, appDevice),
      body: { purpose: "chapter", contentType: "image/png", contentLength: 1024, fileName: "a.png" },
    });
    assert.equal(noScope.status, 403, noScope.raw);

    const otherScope = await request("POST", "/api/upload/presign", {
      headers: authHeaders(appToken, appDevice),
      body: {
        purpose: "chapter",
        contentType: "image/png",
        contentLength: 1024,
        fileName: "a.png",
        manhuaId: otherManhua.json._id,
      },
    });
    assert.equal(otherScope.status, 403, otherScope.raw);

    const createDenied = await request("POST", "/api/editor/manhuas", {
      headers: authHeaders(appToken, appDevice),
      body: { title: "personal bypass" },
    });
    assert.ok([401, 403].includes(createDenied.status));

    const png = await sharp({
      create: { width: 12, height: 20, channels: 3, background: { r: 4, g: 5, b: 6 } },
    })
      .png()
      .toBuffer();

    const ownPresign = await request("POST", "/api/upload/presign", {
      headers: authHeaders(appToken, appDevice),
      body: {
        purpose: "chapter",
        contentType: "image/png",
        contentLength: png.length,
        fileName: "page.png",
        manhuaId: teamManhua.json._id,
        slug: teamManhua.json.slug,
      },
    });
    assert.ok([200, 500].includes(ownPresign.status), ownPresign.raw);

    let pageUrl = null;
    if (ownPresign.status === 200) {
      const putStatus = await putBytes(ownPresign.json.uploadUrl, png, ownPresign.json.headers || {});
      assert.ok(putStatus >= 200 && putStatus < 300, `R2 PUT ${putStatus}`);
      const finalized = await request("POST", "/api/upload/finalize", {
        headers: authHeaders(appToken, appDevice),
        body: { token: ownPresign.json.token },
      });
      assert.equal(finalized.status, 200, finalized.raw);
      pageUrl = finalized.json.url;
      const ledger = await query(
        `SELECT status, bytes FROM arc.editor_quota_ledger WHERE user_id=$1 AND kind='upload' ORDER BY created_at DESC LIMIT 1`,
        [appUserId]
      );
      assert.equal(ledger.rowCount, 1);
      assert.equal(ledger.rows[0].status, "committed");
    } else {
      pageUrl = `https://cdn.example.com/pgitest-team-only-${stamp}.png`;
      await query(
        `INSERT INTO arc.published_uploads (id, user_id, purpose, url, bytes, extra, created_at)
         VALUES ($1,$2,'chapter',$3,$4,'{"pgitest":true}'::jsonb, now())`,
        [newId(), appUserId, pageUrl, png.length]
      );
    }

    const draft = await request("POST", `/api/editor/manhuas/${teamManhua.json.slug}/chapters`, {
      headers: authHeaders(appToken, appDevice),
      body: {
        chapterNumber: 1,
        title: "Team member draft",
        status: "draft",
        pages: [{ imageUrl: pageUrl }],
      },
    });
    assert.equal(draft.status, 201, draft.raw);
    ids.chapters.push(String(draft.json._id));
    await markPgitest("chapters", draft.json._id);
    assert.equal(draft.json.status, "draft");

    const preview = await request("GET", `/api/editor/chapters/${draft.json._id}`, {
      headers: authHeaders(appToken, appDevice),
    });
    assert.equal(preview.status, 200, preview.raw);
    assert.ok((preview.json.pages || []).length >= 1);

    const published = await request("PUT", `/api/editor/chapters/${draft.json._id}`, {
      headers: authHeaders(appToken, appDevice),
      body: { status: "published" },
    });
    assert.equal(published.status, 200, published.raw);
    assert.equal(published.json.status, "published");

    const otherChapter = await request("POST", `/api/editor/manhuas/${otherManhua.json.slug}/chapters`, {
      headers: authHeaders(appToken, appDevice),
      body: { chapterNumber: 1, title: "nope", status: "draft", pages: [{ imageUrl: pageUrl }] },
    });
    assert.equal(otherChapter.status, 403);

    const stalePresign = await request("POST", "/api/upload/presign", {
      headers: authHeaders(appToken, appDevice),
      body: {
        purpose: "chapter",
        contentType: "image/png",
        contentLength: 64,
        fileName: "stale.png",
        manhuaId: teamManhua.json._id,
      },
    });
    const staleOk = stalePresign.status === 200;

    await query(
      `INSERT INTO arc.editor_quota_ledger (
         id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at
       ) VALUES ($1,$2,'upload',$3,$4,'committed', now() + interval '1 day', '{"pgitest":true}'::jsonb, now(), now())`,
      [newId(), appUserId, UPLOAD_BYTES_PER_DAY, `full-${stamp}`]
    );
    const overQuota = await request("POST", "/api/upload/presign", {
      headers: authHeaders(appToken, appDevice),
      body: {
        purpose: "chapter",
        contentType: "image/png",
        contentLength: png.length,
        fileName: "over.png",
        manhuaId: teamManhua.json._id,
      },
    });
    assert.equal(overQuota.status, 429, overQuota.raw);
    assert.equal(overQuota.json.quota?.kind, "upload");
    assert.equal(overQuota.json.quota?.limit, UPLOAD_BYTES_PER_DAY);
    const staffWhileCapped = await request("POST", "/api/upload/presign", {
      headers: authHeaders(otherEditor.token, otherEditor.deviceId),
      body: {
        purpose: "chapter",
        contentType: "image/png",
        contentLength: png.length,
        fileName: "staff.png",
      },
    });
    assert.ok([200, 500].includes(staffWhileCapped.status), staffWhileCapped.raw);
    console.log(
      JSON.stringify({
        teamOnlyUploadQuota: {
          limitBytes: UPLOAD_BYTES_PER_DAY,
          limitLabel: fmt(UPLOAD_BYTES_PER_DAY),
          windowHours: 24,
          enforced: true,
          staffSkip: true,
        },
      })
    );
    const removed = await request("DELETE", `/api/editor/teams/${teamId}/members/${appUserId}`, {
      headers: authHeaders(admin.token, admin.deviceId),
    });
    assert.equal(removed.status, 200, removed.raw);
    const memberGone = await query(`SELECT 1 FROM arc.team_members WHERE team_id=$1 AND user_id=$2`, [
      teamId,
      appUserId,
    ]);
    assert.equal(memberGone.rowCount, 0);

    if (staleOk) {
      const staleFinalize = await request("POST", "/api/upload/finalize", {
        headers: authHeaders(appToken, appDevice),
        body: { token: stalePresign.json.token },
      });
      assert.equal(staleFinalize.status, 403, staleFinalize.raw);
    }
    const afterRemovePresign = await request("POST", "/api/upload/presign", {
      headers: authHeaders(appToken, appDevice),
      body: {
        purpose: "chapter",
        contentType: "image/png",
        contentLength: png.length,
        fileName: "gone.png",
        manhuaId: teamManhua.json._id,
      },
    });
    assert.equal(afterRemovePresign.status, 403, afterRemovePresign.raw);
    const afterRemoveChapter = await request("POST", `/api/editor/manhuas/${teamManhua.json.slug}/chapters`, {
      headers: authHeaders(appToken, appDevice),
      body: { chapterNumber: 9, title: "gone", status: "draft", pages: [{ imageUrl: pageUrl }] },
    });
    assert.ok([401, 403].includes(afterRemoveChapter.status), afterRemoveChapter.raw);

    const listingB = await request("POST", "/api/recruitment", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: listingBody("Overlap хүсэлт хайж байна", teamId),
    });
    assert.equal(listingB.status, 201, listingB.raw);
    const overlapUser = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": `pgitest-dev-${stamp}-ov` },
      body: {
        username: `pgitu_ov_${stamp}`,
        email: `pgitu_ov_${stamp}@pgitest.local`,
        password,
        deviceId: `pgitest-dev-${stamp}-ov`,
      },
    });
    assert.equal(overlapUser.status, 200, overlapUser.raw);
    ids.users.push(String(overlapUser.json.user._id));
    const ovToken = overlapUser.json.token;
    const ovDevice = `pgitest-dev-${stamp}-ov`;
    const ovId = String(overlapUser.json.user._id);
    const ovApply = await request("POST", `/api/recruitment/${listingB.json.id}/applications`, {
      headers: authHeaders(ovToken, ovDevice),
      body: applyBody,
    });
    assert.equal(ovApply.status, 201, ovApply.raw);
    const ovInvite = await request("POST", `/api/editor/teams/${teamId}/members`, {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { userId: ovId, role: "editor" },
    });
    assert.equal(ovInvite.status, 200, ovInvite.raw);
    const inviteId = String(ovInvite.json.invite._id || ovInvite.json.invite.id);
    const overlap = await Promise.all([
      request("POST", `/api/recruitment/applications/${ovApply.json.id}/decision`, {
        headers: authHeaders(admin.token, admin.deviceId),
        body: { action: "accept" },
      }),
      request("POST", `/api/me/team-invites/${inviteId}/accept`, {
        headers: authHeaders(ovToken, ovDevice),
      }),
    ]);
    const overlapOk = overlap.filter((r) => r.status === 200);
    assert.ok(overlapOk.length >= 1, JSON.stringify(overlap.map((r) => ({ status: r.status, json: r.json }))));
    const members = await query(`SELECT role FROM arc.team_members WHERE team_id=$1 AND user_id=$2`, [teamId, ovId]);
    assert.equal(members.rowCount, 1);
    const appState = await query(`SELECT status FROM arc.team_recruitment_applications WHERE id=$1`, [ovApply.json.id]);
    assert.equal(appState.rows[0].status, "accepted");
    const inviteState = await query(`SELECT status FROM arc.team_invites WHERE id=$1`, [inviteId]);
    assert.equal(inviteState.rows[0].status, "accepted");
    assert.equal(appState.rows[0].status === "accepted" && members.rowCount === 1, true);

    const listingC = await request("POST", "/api/recruitment", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: listingBody("Race хүсэлт хайж байна", teamId),
    });
    assert.equal(listingC.status, 201, listingC.raw);
    const raceUser = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": `pgitest-dev-${stamp}-rc` },
      body: {
        username: `pgitu_rc_${stamp}`,
        email: `pgitu_rc_${stamp}@pgitest.local`,
        password,
        deviceId: `pgitest-dev-${stamp}-rc`,
      },
    });
    assert.equal(raceUser.status, 200, raceUser.raw);
    ids.users.push(String(raceUser.json.user._id));
    const rcToken = raceUser.json.token;
    const rcDevice = `pgitest-dev-${stamp}-rc`;
    const rcId = String(raceUser.json.user._id);
    const rcApply = await request("POST", `/api/recruitment/${listingC.json.id}/applications`, {
      headers: authHeaders(rcToken, rcDevice),
      body: applyBody,
    });
    assert.equal(rcApply.status, 201, rcApply.raw);
    const raced = await Promise.all([
      request("POST", `/api/recruitment/applications/${rcApply.json.id}/decision`, {
        headers: authHeaders(admin.token, admin.deviceId),
        body: { action: "accept" },
      }),
      request("POST", `/api/recruitment/applications/${rcApply.json.id}/decision`, {
        headers: authHeaders(admin.token, admin.deviceId),
        body: { action: "reject", decisionNote: "Давхар оролдлого" },
      }),
      request("POST", `/api/recruitment/applications/${rcApply.json.id}/withdraw`, {
        headers: authHeaders(rcToken, rcDevice),
      }),
    ]);
    const terminals = raced.filter((r) => r.status === 200);
    assert.equal(terminals.length, 1, JSON.stringify(raced.map((r) => ({ status: r.status, json: r.json }))));
    const finalApp = await query(`SELECT status FROM arc.team_recruitment_applications WHERE id=$1`, [rcApply.json.id]);
    const finalMember = await query(`SELECT 1 FROM arc.team_members WHERE team_id=$1 AND user_id=$2`, [teamId, rcId]);
    const status = finalApp.rows[0].status;
    assert.ok(["accepted", "rejected", "withdrawn"].includes(status));
    assert.equal(status === "pending", false);
    assert.equal(finalMember.rowCount, status === "accepted" ? 1 : 0);
  });

  test("self-serve team create: allow/deny, txn, cap, permissions, quota, flag", async () => {
    const quota = require("../../src/services/editorQuotaService");
    const { MANHUA_LIMIT_PER_DAY, UPLOAD_BYTES_PER_DAY } = require("../../src/config/selfServeEditor");
    const { newId } = require("../../src/store/pg/helpers");
    const tStamp = `tc${stamp}`;
    const prevCreateFlag = process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
    process.env.SELF_SERVE_TEAM_CREATION_ENABLED = "true";
    const TEAM_BIO = "Энэ бол хангалттай урт багийн танилцуулга юм.";
    const teamBody = (name) => ({
      name,
      description: TEAM_BIO,
      acceptTerms: true,
      ownerId: "deadbeefdeadbeefdeadbeef",
      role: "admin",
      members: [{ user: "deadbeefdeadbeefdeadbeef", role: "owner" }],
    });

    const admin = await makeStaff("admin", `pgittc_a_${tStamp}`);
    const staffEditor = await makeStaff("editor", `pgittc_e_${tStamp}`);
    const translator = await makeStaff("translator", `pgittc_t_${tStamp}`);
    const otherEditor = await makeStaff("editor", `pgittc_o_${tStamp}`);

    const plain = await makeStaff("user", `pgittc_u_${tStamp}`);
    const userDenied = await request("POST", "/api/editor/teams", {
      headers: authHeaders(plain.token, plain.deviceId),
      body: teamBody(`pgitest-user-team-${tStamp}`),
    });
    assert.ok([401, 403].includes(userDenied.status), userDenied.raw);

    const translatorDenied = await request("POST", "/api/editor/teams", {
      headers: authHeaders(translator.token, translator.deviceId),
      body: teamBody(`pgitest-tr-team-${tStamp}`),
    });
    assert.equal(translatorDenied.status, 403, translatorDenied.raw);

    const wsEditor = await request("GET", "/api/user/workspace", {
      headers: authHeaders(staffEditor.token, staffEditor.deviceId),
    });
    assert.equal(wsEditor.status, 200, wsEditor.raw);
    assert.equal(wsEditor.json.canCreateTeam, true);
    const wsUser = await request("GET", "/api/user/workspace", {
      headers: authHeaders(plain.token, plain.deviceId),
    });
    assert.equal(wsUser.json.canCreateTeam, false);

    const created = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(staffEditor.token, staffEditor.deviceId), "Idempotency-Key": `tc-ed-${tStamp}` },
      body: teamBody(`pgitest-self-${tStamp}`),
    });
    assert.equal(created.status, 201, created.raw);
    const teamId = String(created.json._id);
    ids.teams.push(teamId);
    await markPgitest("teams", teamId);
    assert.equal(created.json.myRole, "owner");
    assert.equal(created.json.members?.[0]?.role, "owner");
    assert.equal(String(created.json.members?.[0]?.user?._id || created.json.members?.[0]?.user), String(staffEditor.user._id));
    assert.equal(created.json.members?.[0]?.user?.email, undefined);
    const rawTeam = await query(`SELECT created_by, extra FROM arc.teams WHERE id=$1`, [teamId]);
    assert.equal(String(rawTeam.rows[0].created_by), String(staffEditor.user._id));
    assert.equal(rawTeam.rows[0].extra?.source, "self-serve");

    const replay = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(staffEditor.token, staffEditor.deviceId), "Idempotency-Key": `tc-ed-${tStamp}` },
      body: teamBody(`pgitest-self-retry-${tStamp}`),
    });
    assert.ok([200, 201].includes(replay.status), replay.raw);
    assert.equal(String(replay.json._id), teamId);

    const listed = await request("GET", "/api/editor/teams", {
      headers: authHeaders(staffEditor.token, staffEditor.deviceId),
    });
    assert.equal(listed.status, 200, listed.raw);
    assert.ok(listed.json.some((t) => String(t._id) === teamId));
    assert.ok(listed.json.every((t) => !t.members?.some((m) => m.user?.email)));

    const outsiderGet = await request("GET", `/api/editor/teams/${teamId}`, {
      headers: authHeaders(otherEditor.token, otherEditor.deviceId),
    });
    assert.equal(outsiderGet.status, 403, outsiderGet.raw);
    const outsiderPatch = await request("PATCH", `/api/editor/teams/${teamId}`, {
      headers: authHeaders(otherEditor.token, otherEditor.deviceId),
      body: { name: "hijack" },
    });
    assert.equal(outsiderPatch.status, 403, outsiderPatch.raw);
    const outsiderMember = await request("POST", `/api/editor/teams/${teamId}/members`, {
      headers: authHeaders(otherEditor.token, otherEditor.deviceId),
      body: { userId: String(otherEditor.user._id), role: "admin" },
    });
    assert.equal(outsiderMember.status, 403, outsiderMember.raw);

    const adminCreated = await request("POST", "/api/editor/teams", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { name: `pgitest-admin-${tStamp}` },
    });
    assert.equal(adminCreated.status, 201, adminCreated.raw);
    ids.teams.push(String(adminCreated.json._id));
    await markPgitest("teams", adminCreated.json._id);

    const memberUser = await makeStaff("user", `pgittc_m_${tStamp}`);
    const teamAdminStaff = await makeStaff("editor", `pgittc_ta_${tStamp}`);
    const teamEditorStaff = await makeStaff("editor", `pgittc_te_${tStamp}`);
    await query(
      `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
       VALUES ($1,$2,'editor',$3,now()), ($1,$4,'admin',$3,now()), ($1,$5,'editor',$3,now())
       ON CONFLICT (team_id, user_id) DO UPDATE SET role=EXCLUDED.role`,
      [
        teamId,
        String(memberUser.user._id),
        String(staffEditor.user._id),
        String(teamAdminStaff.user._id),
        String(teamEditorStaff.user._id),
      ]
    );

    const teamOnlyCreate = await request("POST", "/api/editor/teams", {
      headers: authHeaders(memberUser.token, memberUser.deviceId),
      body: teamBody(`pgitest-teamonly-${tStamp}`),
    });
    assert.equal(teamOnlyCreate.status, 403, teamOnlyCreate.raw);

    const ownerPatch = await request("PATCH", `/api/editor/teams/${teamId}`, {
      headers: authHeaders(staffEditor.token, staffEditor.deviceId),
      body: { description: `${TEAM_BIO} updated` },
    });
    assert.equal(ownerPatch.status, 200, ownerPatch.raw);
    const teamAdminPatch = await request("PATCH", `/api/editor/teams/${teamId}`, {
      headers: authHeaders(teamAdminStaff.token, teamAdminStaff.deviceId),
      body: { name: "nope-admin" },
    });
    assert.equal(teamAdminPatch.status, 403, teamAdminPatch.raw);
    const teamEditorPatch = await request("PATCH", `/api/editor/teams/${teamId}`, {
      headers: authHeaders(teamEditorStaff.token, teamEditorStaff.deviceId),
      body: { name: "nope-member" },
    });
    assert.equal(teamEditorPatch.status, 403, teamEditorPatch.raw);

    const teamAdminInvite = await request("POST", `/api/editor/teams/${teamId}/members`, {
      headers: authHeaders(teamAdminStaff.token, teamAdminStaff.deviceId),
      body: { userId: String(otherEditor.user._id), role: "editor" },
    });
    assert.equal(teamAdminInvite.status, 200, teamAdminInvite.raw);
    const teamEditorInvite = await request("POST", `/api/editor/teams/${teamId}/members`, {
      headers: authHeaders(teamEditorStaff.token, teamEditorStaff.deviceId),
      body: { userId: String(translator.user._id), role: "editor" },
    });
    assert.equal(teamEditorInvite.status, 403, teamEditorInvite.raw);

    const demoteOwner = await request("PATCH", `/api/editor/teams/${teamId}/members/${staffEditor.user._id}`, {
      headers: authHeaders(teamAdminStaff.token, teamAdminStaff.deviceId),
      body: { role: "editor" },
    });
    assert.equal(demoteOwner.status, 400, demoteOwner.raw);
    assert.equal(demoteOwner.json.code, "LAST_OWNER");
    const promoteSelf = await request("PATCH", `/api/editor/teams/${teamId}/members/${teamAdminStaff.user._id}`, {
      headers: authHeaders(teamAdminStaff.token, teamAdminStaff.deviceId),
      body: { role: "owner" },
    });
    assert.equal(promoteSelf.status, 400, promoteSelf.raw);
    const removeOwner = await request("DELETE", `/api/editor/teams/${teamId}/members/${staffEditor.user._id}`, {
      headers: authHeaders(staffEditor.token, staffEditor.deviceId),
    });
    assert.equal(removeOwner.status, 400, removeOwner.raw);
    assert.equal(removeOwner.json.code, "LAST_OWNER");

    const ownerManhua = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(staffEditor.token, staffEditor.deviceId), "Idempotency-Key": `tc-mh-${tStamp}` },
      body: { title: `Pgitest tc ${tStamp}`, slug: `pgitest-tc-${tStamp}`, teamId },
    });
    assert.equal(ownerManhua.status, 201, ownerManhua.raw);
    ids.manhuas.push(String(ownerManhua.json._id));
    await markPgitest("manhuas", ownerManhua.json._id);
    assert.equal(String(ownerManhua.json.createdBy?._id || ownerManhua.json.createdBy), String(staffEditor.user._id));

    const foreignAttach = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(otherEditor.token, otherEditor.deviceId), "Idempotency-Key": `tc-foreign-${tStamp}` },
      body: { title: `Pgitest steal ${tStamp}`, slug: `pgitest-steal-${tStamp}`, teamId },
    });
    assert.equal(foreignAttach.status, 403, foreignAttach.raw);

    const otherManhua = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(otherEditor.token, otherEditor.deviceId), "Idempotency-Key": `tc-om-${tStamp}` },
      body: { title: `Pgitest other ${tStamp}`, slug: `pgitest-other-tc-${tStamp}` },
    });
    assert.equal(otherManhua.status, 201, otherManhua.raw);
    ids.manhuas.push(String(otherManhua.json._id));
    await markPgitest("manhuas", otherManhua.json._id);
    const stealExisting = await request("PATCH", `/api/editor/manhuas/${otherManhua.json._id}`, {
      headers: authHeaders(staffEditor.token, staffEditor.deviceId),
      body: { teamId },
    });
    assert.ok([401, 403, 404].includes(stealExisting.status), stealExisting.raw);

    const listing = await request("POST", "/api/recruitment", {
      headers: authHeaders(staffEditor.token, staffEditor.deviceId),
      body: {
        title: "Хүн хайх зар шалгалт",
        teamId,
        workRole: "translation",
        description: "Энэ бол хангалттай урт зарны тайлбар бөгөөд дор хаяж тавин тэмдэгт байна.",
        languages: ["mn"],
        compensation: "volunteer",
        expiresInDays: 30,
        status: "open",
      },
    });
    assert.equal(listing.status, 201, listing.raw);

    const secondTeam = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(staffEditor.token, staffEditor.deviceId), "Idempotency-Key": `tc-ed2-${tStamp}` },
      body: teamBody(`pgitest-self-2-${tStamp}`),
    });
    assert.equal(secondTeam.status, 201, secondTeam.raw);
    ids.teams.push(String(secondTeam.json._id));
    await markPgitest("teams", secondTeam.json._id);
    const thirdTeam = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(staffEditor.token, staffEditor.deviceId), "Idempotency-Key": `tc-ed3-${tStamp}` },
      body: teamBody(`pgitest-self-3-${tStamp}`),
    });
    assert.equal(thirdTeam.status, 403, thirdTeam.raw);
    assert.equal(thirdTeam.json.code, "SELF_SERVE_TEAM_LIMIT");

    const capEditor = await makeStaff("editor", `pgittc_c_${tStamp}`);
    const concurrent = await Promise.all(
      [0, 1, 2].map((i) =>
        request("POST", "/api/editor/teams", {
          headers: { ...authHeaders(capEditor.token, capEditor.deviceId), "Idempotency-Key": `tc-cc-${tStamp}-${i}` },
          body: teamBody(`pgitest-cc-${tStamp}-${i}`),
        })
      )
    );
    const okCreates = concurrent.filter((r) => r.status === 201 || r.status === 200);
    const limited = concurrent.filter((r) => r.status === 403 && r.json.code === "SELF_SERVE_TEAM_LIMIT");
    assert.equal(okCreates.length, 2, JSON.stringify(concurrent.map((r) => ({ s: r.status, c: r.json?.code, m: r.json?.message }))));
    assert.equal(limited.length, 1);
    for (const row of okCreates) {
      ids.teams.push(String(row.json._id));
      await markPgitest("teams", row.json._id);
    }
    const sameKey = await Promise.all([
      request("POST", "/api/editor/teams", {
        headers: { ...authHeaders(otherEditor.token, otherEditor.deviceId), "Idempotency-Key": `tc-same-${tStamp}` },
        body: teamBody(`pgitest-same-${tStamp}`),
      }),
      request("POST", "/api/editor/teams", {
        headers: { ...authHeaders(otherEditor.token, otherEditor.deviceId), "Idempotency-Key": `tc-same-${tStamp}` },
        body: teamBody(`pgitest-same-${tStamp}`),
      }),
    ]);
    assert.ok(sameKey.every((r) => r.status === 201 || r.status === 200), JSON.stringify(sameKey.map((r) => r.status)));
    assert.equal(String(sameKey[0].json._id), String(sameKey[1].json._id));
    ids.teams.push(String(sameKey[0].json._id));
    await markPgitest("teams", sameKey[0].json._id);

    const prevFail = process.env.PGITEST_TEAM_CREATE_FAIL;
    process.env.PGITEST_TEAM_CREATE_FAIL = String(otherEditor.user._id);
    const beforeCount = await query(`SELECT COUNT(*)::int AS n FROM arc.teams WHERE created_by=$1`, [
      String(otherEditor.user._id),
    ]);
    const rolled = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(otherEditor.token, otherEditor.deviceId), "Idempotency-Key": `tc-roll-${tStamp}` },
      body: teamBody(`pgitest-roll-${tStamp}`),
    });
    assert.ok(rolled.status >= 500, rolled.raw);
    const afterCount = await query(`SELECT COUNT(*)::int AS n FROM arc.teams WHERE created_by=$1`, [
      String(otherEditor.user._id),
    ]);
    assert.equal(afterCount.rows[0].n, beforeCount.rows[0].n);
    if (prevFail == null) delete process.env.PGITEST_TEAM_CREATE_FAIL;
    else process.env.PGITEST_TEAM_CREATE_FAIL = prevFail;

    const sse = await makeStaff("user", `pgittc_s_${tStamp}`);
    const become = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(sse.token, sse.deviceId),
      body: {
        penName: "Team Create Pen",
        bio: TEAM_BIO,
        skills: ["translation"],
        experience: "beginner",
        languages: ["mn"],
        acceptTerms: true,
      },
    });
    assert.ok([200, 201].includes(become.status), become.raw);
    const sseToken = become.json.token;
    const sseTeam = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(sseToken, sse.deviceId), "Idempotency-Key": `tc-sse-${tStamp}` },
      body: teamBody(`pgitest-sse-team-${tStamp}`),
    });
    assert.equal(sseTeam.status, 201, sseTeam.raw);
    ids.teams.push(String(sseTeam.json._id));
    await markPgitest("teams", sseTeam.json._id);
    const sseId = String(become.json.user._id);
    assert.equal(await quota.shouldEnforceUploadQuota({ _id: sseId, role: "editor" }), true);
    for (let i = 0; i < MANHUA_LIMIT_PER_DAY; i += 1) {
      await query(
        `INSERT INTO arc.editor_quota_ledger (
           id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at
         ) VALUES ($1,$2,'manhua',0,$3,'committed', now() + interval '1 day', '{"pgitest":true}'::jsonb, now(), now())`,
        [newId(), sseId, `tc-mh-${tStamp}-${i}`]
      );
    }
    const sixth = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(sseToken, sse.deviceId), "Idempotency-Key": `tc-sse-6-${tStamp}` },
      body: { title: `Pgitest sse 6 ${tStamp}`, slug: `pgitest-sse6-${tStamp}` },
    });
    assert.equal(sixth.status, 429, sixth.raw);
    await query(
      `INSERT INTO arc.editor_quota_ledger (
         id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at
       ) VALUES ($1,$2,'upload',$3,$4,'committed', now() + interval '1 day', '{"pgitest":true}'::jsonb, now(), now())`,
      [newId(), sseId, UPLOAD_BYTES_PER_DAY, `tc-up-${tStamp}`]
    );
    const cappedUpload = await request("POST", "/api/upload/presign", {
      headers: authHeaders(sseToken, sse.deviceId),
      body: { purpose: "chapter", contentType: "image/png", contentLength: 64, fileName: "q.png" },
    });
    assert.equal(cappedUpload.status, 429, cappedUpload.raw);

    await query(`UPDATE arc.users SET blocked=true WHERE id=$1`, [String(otherEditor.user._id)]);
    const blockedCreate = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(otherEditor.token, otherEditor.deviceId), "Idempotency-Key": `tc-block-${tStamp}` },
      body: teamBody(`pgitest-blocked-${tStamp}`),
    });
    assert.equal(blockedCreate.status, 403, blockedCreate.raw);
    assert.equal(blockedCreate.json.code, "ACCOUNT_DISABLED");
    await query(`UPDATE arc.users SET blocked=false, is_active=true WHERE id=$1`, [String(otherEditor.user._id)]);

    const lockTarget = await makeStaff("editor", `pgittc_l_${tStamp}`);
    await query(`UPDATE arc.users SET lock_until=now() + interval '10 minutes', lock_reason='pgitest' WHERE id=$1`, [
      String(lockTarget.user._id),
    ]);
    const lockedCreate = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(lockTarget.token, lockTarget.deviceId), "Idempotency-Key": `tc-lock-${tStamp}` },
      body: teamBody(`pgitest-locked-${tStamp}`),
    });
    assert.equal(lockedCreate.status, 423, lockedCreate.raw);
    await query(`UPDATE arc.users SET lock_until=NULL, lock_reason='' WHERE id=$1`, [String(lockTarget.user._id)]);

    const prevFlag = process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
    process.env.SELF_SERVE_TEAM_CREATION_ENABLED = "false";
    const flagEditor = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(otherEditor.token, otherEditor.deviceId), "Idempotency-Key": `tc-flag-${tStamp}` },
      body: teamBody(`pgitest-flag-${tStamp}`),
    });
    assert.equal(flagEditor.status, 403, flagEditor.raw);
    assert.equal(flagEditor.json.code, "SELF_SERVE_TEAM_CREATION_DISABLED");
    const flagAdmin = await request("POST", "/api/editor/teams", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { name: `pgitest-flag-admin-${tStamp}` },
    });
    assert.equal(flagAdmin.status, 201, flagAdmin.raw);
    ids.teams.push(String(flagAdmin.json._id));
    await markPgitest("teams", flagAdmin.json._id);
    if (prevFlag == null) delete process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
    else process.env.SELF_SERVE_TEAM_CREATION_ENABLED = prevFlag;

    const prevFreeze = process.env.API_READ_ONLY;
    process.env.API_READ_ONLY = "true";
    const frozen = await request("POST", "/api/editor/teams", {
      headers: { ...authHeaders(admin.token, admin.deviceId), "Idempotency-Key": `tc-frz-${tStamp}` },
      body: { name: `pgitest-frozen-${tStamp}` },
    });
    assert.equal(frozen.status, 503, frozen.raw);
    if (prevFreeze == null) delete process.env.API_READ_ONLY;
    else process.env.API_READ_ONLY = prevFreeze;
    if (prevCreateFlag == null) delete process.env.SELF_SERVE_TEAM_CREATION_ENABLED;
    else process.env.SELF_SERVE_TEAM_CREATION_ENABLED = prevCreateFlag;
  });

  test("page-access uses current DB role and membership, not JWT payload", async () => {
    const jwt = require("jsonwebtoken");
    const pStamp = `pa${stamp}`;
    const anonymous = await request("GET", "/api/auth/page-access");
    assert.equal(anonymous.status, 401);

    const bogus = await request("GET", "/api/auth/page-access", {
      headers: { authorization: "Bearer not-a-jwt", "x-device-id": `pgitest-dev-${pStamp}` },
    });
    assert.equal(bogus.status, 401);

    const ordinary = await makeStaff("user", `pgitpa_u_${pStamp}`);
    const ordinaryAccess = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(ordinary.token, ordinary.deviceId),
    });
    assert.equal(ordinaryAccess.status, 200, ordinaryAccess.raw);
    assert.equal(ordinaryAccess.json.pages.admin, false);
    assert.equal(ordinaryAccess.json.pages.editor, false);
    assert.equal(ordinaryAccess.json.pages.editorCreateManhua, false);

    const editor = await makeStaff("editor", `pgitpa_e_${pStamp}`);
    const editorAccess = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(editor.token, editor.deviceId),
    });
    assert.equal(editorAccess.json.pages.admin, false);
    assert.equal(editorAccess.json.pages.editor, true);
    assert.equal(editorAccess.json.pages.editorCreateManhua, true);
    assert.equal(editorAccess.json.pages.editorCreateTeam, true);
    assert.equal(editorAccess.json.pages.editorLeaderboard, true);

    const translator = await makeStaff("translator", `pgitpa_t_${pStamp}`);
    const translatorAccess = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(translator.token, translator.deviceId),
    });
    assert.equal(translatorAccess.json.pages.editor, true);
    assert.equal(translatorAccess.json.pages.editorCreateManhua, true);
    assert.equal(translatorAccess.json.pages.editorCreateTeam, false);
    assert.equal(translatorAccess.json.pages.editorLeaderboard, false);

    const admin = await makeStaff("admin", `pgitpa_a_${pStamp}`);
    const adminAccess = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(admin.token, admin.deviceId),
    });
    assert.equal(adminAccess.json.pages.admin, true);
    assert.equal(adminAccess.json.pages.editor, true);

    const team = await request("POST", "/api/editor/teams", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { name: `pgitest-pa-${pStamp}` },
    });
    assert.equal(team.status, 201, team.raw);
    ids.teams.push(String(team.json._id));
    await markPgitest("teams", team.json._id);
    const teamOnly = await makeStaff("user", `pgitpa_m_${pStamp}`);
    await query(
      `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
       VALUES ($1,$2,'editor',$3,now())`,
      [String(team.json._id), String(teamOnly.user._id), String(admin.user._id)]
    );
    const memberAccess = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(teamOnly.token, teamOnly.deviceId),
    });
    assert.equal(memberAccess.json.pages.editor, true);
    assert.equal(memberAccess.json.pages.editorCreateManhua, false);
    assert.equal(memberAccess.json.pages.editorCreateTeam, false);

    await query(`DELETE FROM arc.team_members WHERE team_id=$1 AND user_id=$2`, [
      String(team.json._id),
      String(teamOnly.user._id),
    ]);
    const afterLeave = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(teamOnly.token, teamOnly.deviceId),
    });
    assert.equal(afterLeave.json.pages.editor, false);

    await query(`UPDATE arc.users SET role='user' WHERE id=$1`, [String(admin.user._id)]);
    const { invalidateUserCache } = require("../../src/middleware/authMiddleware");
    await invalidateUserCache(String(admin.user._id));
    const demoted = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(admin.token, admin.deviceId),
    });
    assert.equal(demoted.status, 200, demoted.raw);
    assert.equal(demoted.json.role, "user");
    assert.equal(demoted.json.pages.admin, false);

    const forgedAdmin = jwt.sign(
      {
        id: String(ordinary.user._id),
        sessionToken: ordinary.user.sessionToken,
        tokenVersion: ordinary.user.tokenVersion || 0,
        role: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const forged = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(forgedAdmin, ordinary.deviceId),
    });
    assert.equal(forged.status, 200, forged.raw);
    assert.equal(forged.json.pages.admin, false);
    assert.equal(forged.json.role, "user");

    await query(`UPDATE arc.users SET lock_until=now() + interval '15 minutes', lock_reason='LOCKED' WHERE id=$1`, [
      String(editor.user._id),
    ]);
    await invalidateUserCache(String(editor.user._id));
    const locked = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(editor.token, editor.deviceId),
    });
    assert.equal(locked.status, 423, locked.raw);
    await query(`UPDATE arc.users SET lock_until=NULL, lock_reason='' WHERE id=$1`, [String(editor.user._id)]);

    await query(`UPDATE arc.users SET blocked=true, is_active=false WHERE id=$1`, [String(editor.user._id)]);
    await invalidateUserCache(String(editor.user._id));
    const banned = await request("GET", "/api/auth/page-access", {
      headers: authHeaders(editor.token, editor.deviceId),
    });
    assert.equal(banned.status, 401, banned.raw);
    await query(`UPDATE arc.users SET blocked=false, is_active=true WHERE id=$1`, [String(editor.user._id)]);
  });

  test("quota policy: team-only, self-serve, self-serve-on-team, staff exemption", async () => {
    const { newId } = require("../../src/store/pg/helpers");
    const quota = require("../../src/services/editorQuotaService");
    const { UPLOAD_BYTES_PER_DAY, MANHUA_LIMIT_PER_DAY } = require("../../src/config/selfServeEditor");
    const qStamp = `qp${stamp}`;
    const deviceId = `pgitest-dev-${qStamp}`;

    async function fillUpload(userId, tag) {
      await query(
        `INSERT INTO arc.editor_quota_ledger (
           id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at
         ) VALUES ($1,$2,'upload',$3,$4,'committed', now() + interval '1 day', '{"pgitest":true}'::jsonb, now(), now())`,
        [newId(), userId, UPLOAD_BYTES_PER_DAY, `full-${qStamp}-${tag}`]
      );
    }

    async function fillManhua(userId, tag, n = MANHUA_LIMIT_PER_DAY) {
      for (let i = 0; i < n; i += 1) {
        await query(
          `INSERT INTO arc.editor_quota_ledger (
             id, user_id, kind, bytes, idempotency_key, status, expires_at, extra, created_at, updated_at
           ) VALUES ($1,$2,'manhua',0,$3,'committed', now() + interval '1 day', '{"pgitest":true}'::jsonb, now(), now())`,
          [newId(), userId, `mh-${qStamp}-${tag}-${i}`]
        );
      }
    }

    async function presignFor(token, manhuaId) {
      return request("POST", "/api/upload/presign", {
        headers: authHeaders(token, deviceId),
        body: {
          purpose: "chapter",
          contentType: "image/png",
          contentLength: 64,
          fileName: "q.png",
          ...(manhuaId ? { manhuaId } : {}),
        },
      });
    }

    const admin = await makeStaff("admin", `pgitqp_a_${qStamp}`);
    const staffEditor = await makeStaff("editor", `pgitqp_e_${qStamp}`);
    const translator = await makeStaff("translator", `pgitqp_t_${qStamp}`);

    const teamRes = await request("POST", "/api/editor/teams", {
      headers: authHeaders(admin.token, admin.deviceId),
      body: { name: `pgitest-quota-policy-${qStamp}` },
    });
    assert.equal(teamRes.status, 201, teamRes.raw);
    const teamId = String(teamRes.json._id);
    ids.teams.push(teamId);
    await markPgitest("teams", teamId);

    const teamManhua = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(admin.token, admin.deviceId), "Idempotency-Key": `qp-tm-${qStamp}` },
      body: { title: `Pgitest qp team ${qStamp}`, slug: `pgitest-qp-team-${qStamp}`, teamId },
    });
    assert.equal(teamManhua.status, 201, teamManhua.raw);
    ids.manhuas.push(String(teamManhua.json._id));
    await markPgitest("manhuas", teamManhua.json._id);
    const teamManhuaId = String(teamManhua.json._id);

    const teamUser = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": `${deviceId}-tu` },
      body: {
        username: `pgitqp_u_${qStamp}`,
        email: `pgitqp_u_${qStamp}@pgitest.local`,
        password,
        deviceId: `${deviceId}-tu`,
      },
    });
    assert.equal(teamUser.status, 200, teamUser.raw);
    ids.users.push(String(teamUser.json.user._id));
    const teamUserId = String(teamUser.json.user._id);
    const teamToken = teamUser.json.token;
    await query(
      `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
       VALUES ($1,$2,'editor',$3,now())`,
      [teamId, teamUserId, String(admin.user._id)]
    );
    assert.equal(teamUser.json.user.role, "user");
    assert.equal(await quota.shouldEnforceUploadQuota({ _id: teamUserId, role: "user" }), true);
    await fillUpload(teamUserId, "teamuser");
    const teamOver = await presignFor(teamToken, teamManhuaId);
    assert.equal(teamOver.status, 429, teamOver.raw);
    assert.equal(teamOver.json.quota?.kind, "upload");
    assert.equal(teamOver.json.quota?.limit, UPLOAD_BYTES_PER_DAY);
    const teamManhuaCreate = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(teamToken, `${deviceId}-tu`), "Idempotency-Key": `qp-tu-${qStamp}` },
      body: { title: `Pgitest qp personal ${qStamp}`, slug: `pgitest-qp-personal-${qStamp}` },
    });
    assert.equal(teamManhuaCreate.status, 403, teamManhuaCreate.raw);

    const sseUser = await request("POST", "/api/auth/register", {
      headers: { "x-device-id": `${deviceId}-sse` },
      body: {
        username: `pgitqp_s_${qStamp}`,
        email: `pgitqp_s_${qStamp}@pgitest.local`,
        password,
        deviceId: `${deviceId}-sse`,
      },
    });
    assert.equal(sseUser.status, 200, sseUser.raw);
    ids.users.push(String(sseUser.json.user._id));
    const sseId = String(sseUser.json.user._id);
    const become = await request("POST", "/api/user/become-editor", {
      headers: authHeaders(sseUser.json.token, `${deviceId}-sse`),
      body: {
        penName: "Quota Policy Pen",
        bio: "Энэ бол хангалттай урт танилцуулга текст юм шүү.",
        skills: ["translation"],
        experience: "beginner",
        languages: ["mn"],
        acceptTerms: true,
      },
    });
    assert.ok([200, 201].includes(become.status), become.raw);
    const sseToken = become.json.token;
    assert.equal(become.json.user.role, "editor");
    const sseFlags = await query(`SELECT self_serve FROM arc.editor_profiles WHERE user_id=$1`, [sseId]);
    assert.equal(sseFlags.rows[0].self_serve, true);
    assert.equal(await quota.shouldEnforceUploadQuota({ _id: sseId, role: "editor" }), true);
    await fillManhua(sseId, "sse");
    const sseSixth = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(sseToken, `${deviceId}-sse`), "Idempotency-Key": `qp-sse-6-${qStamp}` },
      body: { title: `Pgitest qp sse 6 ${qStamp}`, slug: `pgitest-qp-sse6-${qStamp}` },
    });
    assert.equal(sseSixth.status, 429, sseSixth.raw);
    assert.equal(sseSixth.json.code, "SELF_SERVE_QUOTA");
    await fillUpload(sseId, "sse");
    const sseUpload = await presignFor(sseToken);
    assert.equal(sseUpload.status, 429, sseUpload.raw);
    assert.equal(sseUpload.json.quota?.limit, UPLOAD_BYTES_PER_DAY);

    await query(
      `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
       VALUES ($1,$2,'editor',$3,now())
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [teamId, sseId, String(admin.user._id)]
    );
    assert.equal(await quota.shouldEnforceUploadQuota({ _id: sseId, role: "editor" }), true);
    const sseOnTeamManhua = await request("POST", "/api/editor/manhuas", {
      headers: { ...authHeaders(sseToken, `${deviceId}-sse`), "Idempotency-Key": `qp-sse-team-${qStamp}` },
      body: { title: `Pgitest qp sse team ${qStamp}`, slug: `pgitest-qp-sseteam-${qStamp}` },
    });
    assert.equal(sseOnTeamManhua.status, 429, sseOnTeamManhua.raw);
    const sseOnTeamUpload = await presignFor(sseToken, teamManhuaId);
    assert.equal(sseOnTeamUpload.status, 429, sseOnTeamUpload.raw);

    for (const staff of [
      { label: "editor", actor: staffEditor },
      { label: "translator", actor: translator },
      { label: "admin", actor: admin },
    ]) {
      const staffId = String(staff.actor.user._id);
      const profile = await query(`SELECT self_serve FROM arc.editor_profiles WHERE user_id=$1`, [staffId]);
      assert.equal(profile.rowCount, 0);
      assert.equal(await quota.shouldEnforceUploadQuota({ _id: staffId, role: staff.label }), false);
      await fillUpload(staffId, staff.label);
      await fillManhua(staffId, staff.label);
      const skipped = await quota.reserveUpload({
        user: { _id: staffId, role: staff.label, extra: { pgitest: true } },
        bytes: 2048,
        idempotencyKey: `staging/${staffId}/chapter/${qStamp}-${staff.label}`,
      });
      assert.equal(skipped.skipped, true, staff.label);
      const staffPresign = await presignFor(staff.actor.token, staff.label === "admin" ? undefined : teamManhuaId);
      assert.notEqual(staffPresign.status, 429, `${staff.label} ${staffPresign.raw}`);
      const staffManhua = await request("POST", "/api/editor/manhuas", {
        headers: {
          ...authHeaders(staff.actor.token, staff.actor.deviceId),
          "Idempotency-Key": `qp-staff-${staff.label}-${qStamp}`,
        },
        body: { title: `Pgitest qp staff ${staff.label} ${qStamp}`, slug: `pgitest-qp-staff-${staff.label}-${qStamp}` },
      });
      assert.equal(staffManhua.status, 201, staffManhua.raw);
      ids.manhuas.push(String(staffManhua.json._id));
      await markPgitest("manhuas", staffManhua.json._id);
    }
  });
}
