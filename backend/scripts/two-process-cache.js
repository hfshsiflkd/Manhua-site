/**
 * Two backend processes sharing one Redis.
 * Checks chapter update, draft, delete, restore, and free-read expiry.
 * Uses only the local Mongo and Redis started for this script.
 */
const { spawn } = require("child_process");
const path = require("path");

const MONGO_URI = "mongodb://127.0.0.1:27018/manhua_cache_test";
const REDIS_URL = "redis://127.0.0.1:6380";
const JWT_SECRET = "cache-two-process-secret";

const baseEnv = {
  ...process.env,
  MONGO_URI,
  REDIS_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN: "1h",
  NODE_ENV: "test",
  DB_DRIVER: "mongo",
  R2_ACCOUNT_ID: "local",
  R2_ACCESS_KEY_ID: "local-key",
  R2_SECRET_ACCESS_KEY: "local-secret",
  R2_BUCKET_NAME: "unused",
  R2_PUBLIC_BASE_URL: "https://cdn.test",
};

const report = [];
function record(name, ok, detail) {
  report.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["src/server.js"], {
      cwd: path.join(__dirname, ".."),
      env: { ...baseEnv, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let buf = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`server ${port} did not start\n${buf.slice(-2000)}`));
    }, 25000);
    const onData = (chunk) => {
      buf += chunk.toString();
      if (buf.includes("Server running")) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
  });
}

async function api(port, urlPath, { method = "GET", token, body } = {}) {
  const res = await fetch(`http://127.0.0.1:${port}/api${urlPath}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 180) };
  }
  return { status: res.status, json, cacheControl: res.headers.get("cache-control"), cdn: res.headers.get("cdn-cache-control") };
}

async function main() {
  process.env.MONGO_URI = MONGO_URI;
  process.env.REDIS_URL = REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_EXPIRES_IN = "1h";

  const mongoose = require("mongoose");
  await mongoose.connect(MONGO_URI);
  const User = require("../src/models/User");
  const Manhua = require("../src/models/Manhua");
  const Chapter = require("../src/models/Chapter");
  const AppSetting = require("../src/models/AppSetting");
  const { genSessionToken, genJwt } = require("../src/utils/token");

  await Promise.all([
    User.deleteMany({ email: "cache-admin@test.local" }),
    Manhua.deleteMany({ slug: "cache-two-process" }),
    AppSetting.deleteMany({ key: "freeReadMode" }),
  ]);
  const admin = await User.create({
    username: "cache-admin",
    email: "cache-admin@test.local",
    password: "cache-admin-pass",
    role: "admin",
    sessionToken: genSessionToken(),
    isActive: true,
  });
  const manhua = await Manhua.create({
    title: "Cache Two Process",
    slug: "cache-two-process",
    createdBy: admin._id,
    owners: [admin._id],
    status: "ongoing",
  });
  const secret = "https://cdn.test/manhua_pages/secret-page.png";
  const chapter = await Chapter.create({
    manhua: manhua._id,
    chapterNumber: 1,
    title: "Original",
    language: "mn",
    status: "published",
    pages: [{ pageNumber: 1, imageUrl: secret }],
    uploadedBy: admin._id,
  });
  await AppSetting.create({
    key: "freeReadMode",
    value: { enabled: true, expiresAt: null },
  });
  const token = genJwt(admin);
  await mongoose.disconnect();

  const serverA = await startServer(9211);
  const serverB = await startServer(9212);
  const reader = 9211;
  const writer = 9212;

  try {
    const first = await api(reader, "/manhuas/cache-two-process/chapters/1");
    record(
      "reader cache headers are no-store",
      first.cacheControl?.includes("no-store") && first.cdn === "no-store" && !String(first.cacheControl).includes("s-maxage"),
      `cache-control=${first.cacheControl} cdn=${first.cdn}`
    );
    record(
      "process A cached a published chapter with pages",
      first.status === 200 && first.json?.pages?.[0]?.imageUrl === secret,
      `HTTP ${first.status}`
    );

    const renamed = await api(writer, `/editor/chapters/${chapter._id}`, {
      method: "PUT",
      token,
      body: { title: "Renamed", status: "published" },
    });
    const afterRename = await api(reader, "/manhuas/cache-two-process/chapters/1");
    record(
      "update on process B is visible to process A",
      renamed.status === 200 && afterRename.json?.title === "Renamed",
      `write ${renamed.status} read title ${afterRename.json?.title}`
    );

    const drafted = await api(writer, `/editor/chapters/${chapter._id}`, {
      method: "PUT",
      token,
      body: { status: "draft" },
    });
    const afterDraft = await api(reader, "/manhuas/cache-two-process/chapters/1");
    const draftBody = JSON.stringify(afterDraft.json || {});
    record(
      "draft on process B removes pages from process A",
      drafted.status === 200 && afterDraft.status === 404 && !draftBody.includes(secret),
      `write ${drafted.status} read ${afterDraft.status}`
    );

    await api(writer, `/editor/chapters/${chapter._id}`, {
      method: "PUT",
      token,
      body: { status: "published", title: "Original" },
    });
    const recached = await api(reader, "/manhuas/cache-two-process/chapters/1");
    const deleted = await api(writer, `/editor/chapters/${chapter._id}`, { method: "DELETE", token });
    const afterDelete = await api(reader, "/manhuas/cache-two-process/chapters/1");
    record(
      "delete on process B removes the cached chapter from process A",
      recached.status === 200 && deleted.status === 200 && afterDelete.status === 404 && !JSON.stringify(afterDelete.json || {}).includes(secret),
      `cached ${recached.status} delete ${deleted.status} read ${afterDelete.status}`
    );

    const restored = await api(writer, `/admin/trash/chapters/${chapter._id}/restore`, { method: "POST", token });
    const afterRestore = await api(reader, "/manhuas/cache-two-process/chapters/1");
    record(
      "restore on process B makes the chapter readable on process A",
      restored.status === 200 && afterRestore.status === 200 && afterRestore.json?.pages?.[0]?.imageUrl === secret,
      `restore ${restored.status} read ${afterRestore.status}`
    );

    const expiresAt = new Date(Date.now() + 1200).toISOString();
    const armed = await api(writer, "/admin/settings/free-read", {
      method: "POST",
      token,
      body: { enabled: true, expiresAt },
    });
    const whileActive = await api(reader, "/manhuas/cache-two-process/chapters/1");
    await new Promise((resolve) => setTimeout(resolve, 1600));
    const afterExpiry = await api(writer, "/manhuas/cache-two-process/chapters/1");
    record(
      "free-read expiry stops the other process from returning pages",
      armed.status === 200 && Boolean(whileActive.json?.pages?.length) && !afterExpiry.json?.pages,
      `arm ${armed.status} during ${whileActive.json?.pageCount} after pages ${afterExpiry.json?.pages ? "present" : "absent"}`
    );
  } finally {
    serverA.kill("SIGTERM");
    serverB.kill("SIGTERM");
  }

  const failed = report.filter((item) => !item.ok);
  console.log(JSON.stringify({ passed: report.length - failed.length, failed: failed.length, report }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
