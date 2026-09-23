const crypto = require("crypto");
const {
  ImagePolicyError,
  PRESIGN_TTL_SEC,
  assertDeclaredUpload,
  assertRole,
  assertTokenOwner,
  createUploadToken,
  getPurpose,
  readUploadToken,
} = require("../utils/imagePolicy");
const { extensionFor, processImage } = require("../utils/image");

function requireR2Env() {
  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME ||
    !process.env.R2_PUBLIC_BASE_URL
  ) {
    throw new ImagePolicyError("R2 тохиргоо (env) дутуу байна.", 500);
  }
}

function publicUrl(key) {
  const base = String(process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return `${base}/${key}`;
}

function defaultStorage() {
  const {
    r2Client,
    PutObjectCommand,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
  } = require("../config/r2");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  const bucket = process.env.R2_BUCKET_NAME;

  return {
    async signPut({ key, contentType, contentLength }) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      });
      return getSignedUrl(r2Client, command, { expiresIn: PRESIGN_TTL_SEC });
    },
    async head(key) {
      return r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    },
    async getBuffer(key) {
      const res = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!res.Body) return Buffer.alloc(0);
      const chunks = [];
      for await (const chunk of res.Body) chunks.push(chunk);
      return Buffer.concat(chunks);
    },
    async put(key, body, contentType) {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
    },
    async remove(key) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

async function defaultSaveAvatar(user, url) {
  const User = require("../models/User");
  await User.findByIdAndUpdate(user._id || user.id, { avatar: url });
}

function browserHeaders(uploadUrl) {
  let signed = "";
  try {
    signed = new URL(uploadUrl).searchParams.get("X-Amz-SignedHeaders") || "";
  } catch {
    signed = "";
  }
  const names = signed.split(";").map((s) => s.trim().toLowerCase());
  const headers = {};
  if (names.includes("content-type")) {
    headers["Content-Type"] = true;
  }
  return headers;
}

function createImageUploadService(deps = {}) {
  const storage = deps.storage || null;
  const saveAvatar = deps.saveAvatar || defaultSaveAvatar;

  function storageOrDefault() {
    if (storage) return storage;
    requireR2Env();
    return defaultStorage();
  }

  async function presign({ user, purpose, contentType, contentLength, fileName }) {
    assertRole(user, purpose);
    const size = Number(contentLength);
    assertDeclaredUpload({
      purpose,
      contentType,
      contentLength: size,
    });
    const store = storageOrDefault();
    const userId = String(user._id || user.id);
    const key = `staging/${userId}/${purpose}/${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
    if (purpose === "chapter" || purpose === "cover") {
      const quota = require("./editorQuotaService");
      await quota.reserveUpload({ user, bytes: size, idempotencyKey: key });
    }
    let uploadUrl;
    try {
      uploadUrl = await store.signPut({
        key,
        contentType: String(contentType).toLowerCase(),
        contentLength: size,
      });
    } catch (err) {
      if (purpose === "chapter" || purpose === "cover") {
        const quota = require("./editorQuotaService");
        await quota.releaseReservation({ user, kind: "upload", idempotencyKey: key });
      }
      throw err;
    }
    const signedHeaderFlags = browserHeaders(uploadUrl);
    const headers = {};
    if (signedHeaderFlags["Content-Type"]) {
      headers["Content-Type"] = String(contentType).toLowerCase();
    }
    const token = createUploadToken({
      userId,
      purpose,
      key,
      contentType: String(contentType).toLowerCase(),
      contentLength: size,
      fileName: String(fileName || "").slice(0, 180),
      iat: Date.now(),
    });
    return {
      uploadUrl,
      token,
      headers,
      expiresIn: PRESIGN_TTL_SEC,
    };
  }

  async function publishParts(processed, purpose, store) {
    const policy = getPurpose(purpose);
    const stamp = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const uploadedKeys = [];
    const parts = [];
    try {
      for (let i = 0; i < processed.parts.length; i += 1) {
        const part = processed.parts[i];
        const suffix = processed.parts.length > 1 ? `-s${i + 1}` : "";
        const ext = extensionFor(part.contentType);
        const key = `${policy.folder}/${stamp}${suffix}.${ext}`;
        await store.put(key, part.buffer, part.contentType);
        uploadedKeys.push(key);
        parts.push({
          url: publicUrl(key),
          width: part.width,
          height: part.height,
          storage: part.storage,
        });
      }
    } catch (err) {
      await Promise.all(
        uploadedKeys.map((key) => store.remove(key).catch(() => {}))
      );
      throw err;
    }
    return parts;
  }

  async function finalize({ user, token }) {
    const payload = readUploadToken(token);
    assertTokenOwner(payload, user);
    assertRole(user, payload.purpose);
    const policy = getPurpose(payload.purpose);
    const store = storageOrDefault();
    const releaseQuota = async () => {
      if (payload.purpose === "chapter" || payload.purpose === "cover") {
        const quota = require("./editorQuotaService");
        await quota.releaseReservation({ user, kind: "upload", idempotencyKey: payload.key });
      }
    };

    let head;
    try {
      head = await store.head(payload.key);
    } catch {
      await releaseQuota();
      throw new ImagePolicyError(
        "Файл олдсонгүй эсвэл аль хэдийн боловсруулагдсан. Дахин оруулна уу.",
        400
      );
    }

    const actual = Number(head.ContentLength ?? head.contentLength ?? 0);
    if (!Number.isFinite(actual) || actual <= 0 || actual > policy.maxBytes) {
      await store.remove(payload.key).catch(() => {});
      await releaseQuota();
      throw new ImagePolicyError(
        `Файлын бодит хэмжээ зөвшөөрөгдөхгүй. ${policy.label} дээд тал нь ${(policy.maxBytes / (1024 * 1024)).toFixed(0)}MB.`,
        400
      );
    }
    if (actual > Number(payload.contentLength)) {
      await store.remove(payload.key).catch(() => {});
      await releaseQuota();
      throw new ImagePolicyError("Файлын бодит хэмжээ зарласнаас их байна.", 400);
    }

    let buffer;
    try {
      buffer = await store.getBuffer(payload.key);
    } catch {
      await releaseQuota();
      throw new ImagePolicyError("Файлыг уншиж чадсангүй. Дахин оруулна уу.", 400);
    }
    if (!buffer || buffer.length !== actual) {
      await store.remove(payload.key).catch(() => {});
      await releaseQuota();
      throw new ImagePolicyError("Файлын хэмжээ баталгаажаагүй байна.", 400);
    }

    let processed;
    try {
      processed = await processImage(buffer, payload.purpose);
    } catch (err) {
      await store.remove(payload.key).catch(() => {});
      await releaseQuota();
      throw err;
    }

    let parts;
    try {
      parts = await publishParts(processed, payload.purpose, store);
    } catch (err) {
      await store.remove(payload.key).catch(() => {});
      await releaseQuota();
      throw err;
    }
    await store.remove(payload.key).catch(() => {});

    if (payload.purpose === "chapter" || payload.purpose === "cover") {
      const quota = require("./editorQuotaService");
      await quota.commitReservation({
        user,
        kind: "upload",
        idempotencyKey: payload.key,
        bytes: actual,
      });
      await quota.recordPublishedUpload({
        user,
        purpose: payload.purpose,
        url: parts[0].url,
        bytes: actual,
      });
      for (const part of parts.slice(1)) {
        await quota.recordPublishedUpload({
          user,
          purpose: payload.purpose,
          url: part.url,
          bytes: 0,
        });
      }
    }

    if (payload.purpose === "avatar") {
      await saveAvatar(user, parts[0].url);
    }

    return {
      url: parts[0].url,
      urls: parts.map((part) => part.url),
      width: processed.width,
      height: processed.height,
      parts,
      ...(payload.purpose === "avatar" ? { avatar: parts[0].url, success: true } : {}),
    };
  }

  async function publishProcessed(processed, purpose) {
    const store = storageOrDefault();
    return publishParts(processed, purpose, store);
  }

  async function abortStaging({ user, token }) {
    const payload = readUploadToken(token);
    assertTokenOwner(payload, user);
    if (!payload.key.startsWith("staging/")) {
      throw new ImagePolicyError("Зөвхөн дуусаагүй staging файлыг устгана.", 403);
    }
    const store = storageOrDefault();
    await store.remove(payload.key).catch(() => {});
    if (payload.purpose === "chapter" || payload.purpose === "cover") {
      const quota = require("./editorQuotaService");
      await quota.releaseReservation({ user, kind: "upload", idempotencyKey: payload.key });
    }
    return { success: true };
  }

  return { presign, finalize, publishProcessed, abortStaging };
}

module.exports = {
  createImageUploadService,
  requireR2Env,
};
