/**
 * Isolated MinIO + Mongo check for the chapter upload flow.
 * Does not read or write the production database or R2 bucket.
 *
 * Requires:
 *   MinIO  http://127.0.0.1:9100  (minioadmin/minioadmin)
 *   Mongo  mongodb://127.0.0.1:27018/manhua_upload_test
 */
process.env.MONGO_URI = "mongodb://127.0.0.1:27018/manhua_upload_test";
process.env.JWT_SECRET = "isolated-test-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.R2_ENDPOINT = "http://127.0.0.1:9100";
process.env.R2_FORCE_PATH_STYLE = "true";
process.env.R2_ACCOUNT_ID = "local";
process.env.R2_ACCESS_KEY_ID = "minioadmin";
process.env.R2_SECRET_ACCESS_KEY = "minioadmin";
process.env.R2_BUCKET_NAME = "chapter-images-test";
process.env.R2_PUBLIC_BASE_URL = "http://127.0.0.1:9100/chapter-images-test";
process.env.REDIS_URL = "";
process.env.NODE_ENV = "test";
process.env.PORT = "9200";

const sharp = require("sharp");
const mongoose = require("mongoose");
const {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const report = [];
function record(name, ok, detail) {
  report.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

function s3() {
  return new S3Client({
    region: "us-east-1",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

async function prepareBucket() {
  const client = s3();
  const Bucket = process.env.R2_BUCKET_NAME;
  const cors = await client.send(new GetBucketCorsCommand({ Bucket })).catch((err) => err);
  const life = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket })).catch((err) => err);
  return {
    cors: cors.CORSRules || null,
    corsError: cors.CORSRules ? null : `${cors.name}: ${cors.message}`,
    lifecycle: life.Rules
      ? life.Rules.map((rule) => ({
          id: rule.ID,
          prefix: rule.Filter?.Prefix,
          days: rule.Expiration?.Days,
          status: rule.Status,
        }))
      : null,
    lifecycleError: life.Rules ? null : `${life.name}: ${life.message}`,
  };
}

async function countPrefix(prefix) {
  const res = await s3().send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
    })
  );
  return res.KeyCount || 0;
}

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`http://127.0.0.1:${process.env.PORT}/api${path}`, {
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
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function browserPut(uploadUrl, bytes) {
  const res = await fetch(uploadUrl, { method: "PUT", body: bytes });
  return res.status;
}

async function makePng(width, height) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 240, g: 240, b: 240 } },
  })
    .png()
    .toBuffer();
}

async function makeLargeJpeg() {
  return sharp({
    create: {
      width: 4096,
      height: 4096,
      channels: 3,
      background: { r: 100, g: 140, b: 180 },
      noise: { type: "gaussian", mean: 128, sigma: 80 },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer();
}

async function uploadChapterFile(token, bytes, contentType, fileName) {
  const presign = await api("/upload/presign", {
    method: "POST",
    token,
    body: { purpose: "chapter", contentType, contentLength: bytes.length, fileName },
  });
  if (presign.status !== 200) {
    throw new Error(`presign ${presign.status} ${JSON.stringify(presign.json)}`);
  }
  const putStatus = await browserPut(presign.json.uploadUrl, bytes);
  return { presign: presign.json, putStatus };
}

async function main() {
  const bucketSetup = await prepareBucket();
  record(
    "isolated CORS rule readable",
    Boolean(bucketSetup.cors),
    bucketSetup.cors ? JSON.stringify(bucketSetup.cors) : bucketSetup.corsError
  );
  record(
    "isolated staging lifecycle",
    Boolean(bucketSetup.lifecycle?.some((rule) => rule.prefix === "staging/" && rule.days === 1)),
    bucketSetup.lifecycle ? JSON.stringify(bucketSetup.lifecycle) : bucketSetup.lifecycleError
  );

  const preflight = await fetch("http://127.0.0.1:9100/chapter-images-test/staging/probe", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:3018",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  record(
    "browser preflight PUT",
    preflight.headers.get("access-control-allow-origin") === "http://localhost:3018" &&
      (preflight.headers.get("access-control-allow-methods") || "").includes("PUT"),
    `status ${preflight.status} origin ${preflight.headers.get("access-control-allow-origin")} methods ${preflight.headers.get("access-control-allow-methods")}`
  );

  const { default: mongooseConn } = { default: null };
  void mongooseConn;
  await mongoose.connect(process.env.MONGO_URI);
  const User = require("../src/models/User");
  const Manhua = require("../src/models/Manhua");
  const Chapter = require("../src/models/Chapter");
  const AppSetting = require("../src/models/AppSetting");
  const { genSessionToken, genJwt } = require("../src/utils/token");

  await Promise.all([
    User.deleteMany({ email: "isolated-editor@test.local" }),
    Manhua.deleteMany({ slug: "isolated-upload-test" }),
    AppSetting.deleteMany({ key: "freeReadMode" }),
  ]);
  const user = await User.create({
    username: "isolated-editor",
    email: "isolated-editor@test.local",
    password: "isolated-pass-123",
    role: "editor",
    sessionToken: genSessionToken(),
    isActive: true,
  });
  await Manhua.create({
    title: "Isolated Upload Test",
    slug: "isolated-upload-test",
    createdBy: user._id,
    owners: [user._id],
    status: "ongoing",
  });
  await AppSetting.create({
    key: "freeReadMode",
    value: { enabled: true, expiresAt: null },
  });
  const token = genJwt(user);

  const app = require("../src/app");
  const server = await new Promise((resolve) => {
    const listener = app.listen(process.env.PORT, "127.0.0.1", () => resolve(listener));
  });

  try {
    const tall = await makePng(1200, 20000);
    const tallUp = await uploadChapterFile(token, tall, "image/png", "tall.png");
    record("tall PUT", tallUp.putStatus >= 200 && tallUp.putStatus < 300, `HTTP ${tallUp.putStatus} bytes ${tall.length}`);
    const tallFin = await api("/upload/finalize", {
      method: "POST",
      token,
      body: { token: tallUp.presign.token },
    });
    record(
      "tall finalize",
      tallFin.status === 200 && tallFin.json.width === 1200 && tallFin.json.height === 20000,
      `HTTP ${tallFin.status} ${tallFin.json.width}x${tallFin.json.height}`
    );

    const big = await makeLargeJpeg();
    const bigUp = await uploadChapterFile(token, big, "image/jpeg", "big.jpg");
    record(
      "20-25MB PUT",
      big.length > 20 * 1024 * 1024 && big.length <= 25 * 1024 * 1024 && bigUp.putStatus < 300,
      `bytes ${(big.length / 1024 / 1024).toFixed(2)}MiB HTTP ${bigUp.putStatus}`
    );
    const bigFin = await api("/upload/finalize", {
      method: "POST",
      token,
      body: { token: bigUp.presign.token },
    });
    record(
      "20-25MB finalize keeps dimensions",
      bigFin.status === 200 && bigFin.json.width === 4096 && bigFin.json.height === 4096,
      `HTTP ${bigFin.status} ${bigFin.json.width}x${bigFin.json.height} storage ${bigFin.json.parts?.[0]?.storage}`
    );

    const created = await api("/editor/manhuas/isolated-upload-test/chapters", {
      method: "POST",
      token,
      body: {
        chapterNumber: 1,
        title: "Isolated",
        language: "mn",
        status: "published",
        pages: [
          { pageNumber: 1, imageUrl: tallFin.json.url, originalName: "tall.png", width: tallFin.json.width, height: tallFin.json.height },
          { pageNumber: 2, imageUrl: bigFin.json.url, originalName: "big.jpg", width: bigFin.json.width, height: bigFin.json.height },
        ],
      },
    });
    record("chapter save", created.status === 201, `HTTP ${created.status} ${created.json?.message || created.json?._id || ""}`);

    const reader = await api("/manhuas/isolated-upload-test/chapters/1");
    const page = reader.json?.pages?.[0];
    let readerSize = null;
    if (page?.imageUrl) {
      const img = await fetch(page.imageUrl);
      const buf = Buffer.from(await img.arrayBuffer());
      readerSize = await sharp(buf).metadata();
      record(
        "reader image",
        img.status === 200 && readerSize.width === 1200 && readerSize.height === 20000,
        `HTTP ${img.status} ${readerSize.width}x${readerSize.height}`
      );
    } else {
      record("reader image", false, `chapter HTTP ${reader.status} pages ${reader.json?.pageCount}`);
    }

    const bad = Buffer.from("<html>not-image</html>");
    const badUp = await uploadChapterFile(token, bad, "image/png", "bad.png");
    const badFin = await api("/upload/finalize", {
      method: "POST",
      token,
      body: { token: badUp.presign.token },
    });
    const badAgain = await api("/upload/finalize", {
      method: "POST",
      token,
      body: { token: badUp.presign.token },
    });
    record(
      "failed finalize removes staging and retry cannot reuse it",
      badUp.putStatus < 300 && badFin.status === 400 && badAgain.status === 400,
      `put ${badUp.putStatus} first ${badFin.status} retry ${badAgain.status} ${badAgain.json?.message || ""}`
    );

    const pagesBefore = await countPrefix("manhua_pages/");
    const orphanSave = await api("/editor/manhuas/does-not-exist/chapters", {
      method: "POST",
      token,
      body: {
        chapterNumber: 2,
        title: "missing manhua",
        language: "mn",
        status: "published",
        pages: [{ pageNumber: 1, imageUrl: tallFin.json.url, originalName: "tall.png" }],
      },
    });
    const pagesAfterFail = await countPrefix("manhua_pages/");
    const saveRetry = await api("/editor/manhuas/isolated-upload-test/chapters", {
      method: "POST",
      token,
      body: {
        chapterNumber: 2,
        title: "retry",
        language: "mn",
        status: "published",
        pages: [{ pageNumber: 1, imageUrl: tallFin.json.url, originalName: "tall.png" }],
      },
    });
    const pagesAfterRetry = await countPrefix("manhua_pages/");
    record(
      "chapter save failure then retry reuses finalized URL",
      orphanSave.status === 404 && saveRetry.status === 201 && pagesBefore === pagesAfterFail && pagesAfterFail === pagesAfterRetry,
      `save ${orphanSave.status} retry ${saveRetry.status} objects ${pagesBefore}->${pagesAfterFail}->${pagesAfterRetry}`
    );

    const dup = await api("/editor/manhuas/isolated-upload-test/chapters", {
      method: "POST",
      token,
      body: {
        chapterNumber: 2,
        title: "duplicate retry",
        language: "mn",
        status: "published",
        pages: [{ pageNumber: 1, imageUrl: tallFin.json.url }],
      },
    });
    record(
      "second create with the same chapter number is rejected",
      dup.status === 409,
      `HTTP ${dup.status} ${dup.json?.message || ""}`
    );

    const stagingLeft = await countPrefix("staging/");
    record("staging leftover after success", stagingLeft === 0, `staging objects ${stagingLeft}`);

    const stored = await Chapter.findOne({ chapterNumber: 1 }).lean();
    const queryInDb = (stored?.pages || []).some((p) => String(p.imageUrl).includes("X-Amz-"));
    record("saved chapter URL has no signature query", !queryInDb, stored?.pages?.[0]?.imageUrl || "missing");

    await HeadObjectCommand;
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  const failed = report.filter((item) => !item.ok);
  console.log(JSON.stringify({ passed: report.length - failed.length, failed: failed.length, report }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
