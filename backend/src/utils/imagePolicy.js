const crypto = require("crypto");

const MiB = 1024 * 1024;

/** WebP нэг талын дээд хэмжээ. Үүнээс урт зургийг өргөнийг хадгалан хэсэгчилнэ. */
const WEBP_MAX_DIMENSION = 16383;
const JPEG_MAX_DIMENSION = 65535;
/** WebP хязгаараас доогуур, давхцалгүй зурвас. */
const STRIP_HEIGHT = 16000;
const MAX_CONCURRENT_IMAGE_JOBS = 2;
const UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;
const PRESIGN_TTL_SEC = 10 * 60;
/**
 * Vercel function request body: 4MiB хүрдэг, 4.5MiB дээр 413.
 * Үүнээс том файлыг multipart-оор бус presigned PUT-оор авна.
 */
const DIRECT_BODY_SAFE_BYTES = 4 * MiB;

const ALLOWED_INPUT_MIME = ["image/jpeg", "image/png", "image/webp"];

const PURPOSES = {
  chapter: {
    label: "Бүлгийн хуудас",
    maxBytes: 25 * MiB,
    maxWidth: 4096,
    maxHeight: JPEG_MAX_DIMENSION,
    maxPixels: 50_000_000,
    mode: "chapter",
    staffOnly: true,
    folder: "manhua_pages",
    hint: "PNG, JPEG, WebP. Нэг файл 25MB хүртэл. Өргөн 4096px, өндөр 65535px хүртэл. Урт зургийн өргөнийг багасгахгүй.",
  },
  cover: {
    label: "Хавтас",
    maxBytes: 8 * MiB,
    maxWidth: 8000,
    maxHeight: 8000,
    maxPixels: 24_000_000,
    mode: "fit",
    fitWidth: 1600,
    fitHeight: 2400,
    quality: 86,
    staffOnly: true,
    folder: "covers",
    hint: "PNG, JPEG, WebP. 8MB хүртэл. Хавтас 1600×2400px дотор багтааж хадгална.",
  },
  avatar: {
    label: "Профайл зураг",
    maxBytes: 5 * MiB,
    maxWidth: 8000,
    maxHeight: 8000,
    maxPixels: 24_000_000,
    mode: "fit",
    fitWidth: 512,
    fitHeight: 512,
    quality: 86,
    staffOnly: false,
    folder: "avatars",
    hint: "PNG, JPEG, WebP. 5MB хүртэл. 512×512px дотор багтааж хадгална.",
  },
  request: {
    label: "Хүсэлтийн хавсралт",
    maxBytes: 8 * MiB,
    maxWidth: 8000,
    maxHeight: 8000,
    maxPixels: 24_000_000,
    mode: "fit",
    fitWidth: 2000,
    fitHeight: 2000,
    quality: 86,
    staffOnly: false,
    folder: "request_attachments",
    hint: "PNG, JPEG, WebP. 8MB хүртэл. 2000×2000px дотор багтааж хадгална.",
  },
  feedback: {
    label: "Санал хүсэлтийн зураг",
    maxBytes: DIRECT_BODY_SAFE_BYTES,
    maxWidth: 8000,
    maxHeight: 8000,
    maxPixels: 24_000_000,
    mode: "fit",
    fitWidth: 2000,
    fitHeight: 2000,
    quality: 86,
    staffOnly: false,
    presign: false,
    folder: "feedback",
    hint: "PNG, JPEG, WebP. 4MB хүртэл. 2000×2000px дотор багтааж хадгална.",
  },
};

class ImagePolicyError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ImagePolicyError";
    this.statusCode = statusCode;
  }
}

function formatMiB(bytes) {
  return `${(Number(bytes) / MiB).toFixed(1)}MB`;
}

function getPurpose(name) {
  const policy = PURPOSES[name];
  if (!policy) {
    throw new ImagePolicyError("Зургийн төрөл буруу байна.");
  }
  return policy;
}

function assertDeclaredUpload({ purpose, contentType, contentLength }) {
  const policy = getPurpose(purpose);
  if (policy.presign === false) {
    throw new ImagePolicyError("Энэ төрлийг шууд upload-аар авна.", 400);
  }
  const type = String(contentType || "").toLowerCase();
  if (!ALLOWED_INPUT_MIME.includes(type)) {
    throw new ImagePolicyError(
      "Зөвхөн PNG, JPEG, WebP зураг оруулна уу. Хөдөлгөөнт зураг дэмжихгүй."
    );
  }
  const size = Number(contentLength);
  if (!Number.isInteger(size) || size <= 0) {
    throw new ImagePolicyError("Файлын хэмжээ буруу байна.");
  }
  if (size > policy.maxBytes) {
    throw new ImagePolicyError(
      `Файл хэт том байна (${formatMiB(size)}). ${policy.label} дээд тал нь ${formatMiB(policy.maxBytes)}.`
    );
  }
  return policy;
}

function assertRole(user, purpose) {
  const policy = getPurpose(purpose);
  if (!user) {
    throw new ImagePolicyError("Нэвтэрсэн байх шаардлагатай.", 401);
  }
  if (policy.staffOnly) {
    const role = user.role;
    if (!["editor", "translator", "admin"].includes(role)) {
      throw new ImagePolicyError("Энэ төрлийн зураг оруулах эрхгүй.", 403);
    }
  }
}

function orientedSize(meta) {
  const width = Number(meta.width) || 0;
  const height = Number(meta.height) || 0;
  const orientation = Number(meta.orientation) || 1;
  if (orientation >= 5 && orientation <= 8) {
    return { width: height, height: width };
  }
  return { width, height };
}

function needsOrientationNormalize(meta) {
  const orientation = Number(meta.orientation) || 1;
  return orientation >= 2 && orientation <= 8;
}

function assertDecodedBounds(meta, purpose) {
  const policy = getPurpose(purpose);
  const { width, height } = orientedSize(meta);
  if (!width || !height) {
    throw new ImagePolicyError("Зургийн хэмжээг уншиж чадсангүй.");
  }
  if (meta.format === "gif" || meta.format === "svg" || (meta.pages && meta.pages > 1)) {
    throw new ImagePolicyError(
      "Хөдөлгөөнт болон дэмжигдэхгүй зураг. Хөдөлгөөнгүй PNG, JPEG эсвэл WebP ашиглана уу."
    );
  }
  if (!["jpeg", "png", "webp"].includes(meta.format)) {
    throw new ImagePolicyError("Зөвхөн PNG, JPEG, WebP зураг оруулна уу.");
  }
  const pixels = width * height;
  if (pixels > policy.maxPixels) {
    throw new ImagePolicyError(
      `Зургийн пикселийн хэмжээ хэт их байна (${pixels.toLocaleString("en-US")}). Дээд хэмжээ ${policy.maxPixels.toLocaleString("en-US")} пиксел.`
    );
  }
  if (width > policy.maxWidth || height > policy.maxHeight) {
    throw new ImagePolicyError(
      `Зургийн хэмжээ хэт их байна (${width}×${height}). Дээд хэмжээ ${policy.maxWidth}×${policy.maxHeight}px.`
    );
  }
  if (purpose === "chapter" && width > WEBP_MAX_DIMENSION) {
    throw new ImagePolicyError(
      `Зургийн өргөн хэт их байна (${width}px). Дээд өргөн ${WEBP_MAX_DIMENSION}px.`
    );
  }
  return { width, height, policy };
}

function splitStripPlan(height, stripHeight = STRIP_HEIGHT) {
  const total = Number(height);
  if (!Number.isInteger(total) || total <= 0) {
    throw new ImagePolicyError("Зургийн өндөр буруу байна.");
  }
  const size = Math.min(stripHeight, WEBP_MAX_DIMENSION);
  const parts = [];
  let top = 0;
  while (top < total) {
    const partHeight = Math.min(size, total - top);
    parts.push({ top, height: partHeight });
    top += partHeight;
  }
  return parts;
}

function tokenSecret() {
  const secret = process.env.UPLOAD_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new ImagePolicyError("Upload token тохиргоо дутуу байна.", 500);
  }
  return secret;
}

function createUploadToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function readUploadToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new ImagePolicyError("Upload token буруу байна.", 400);
  }
  const idx = token.lastIndexOf(".");
  const body = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new ImagePolicyError("Upload token буруу байна.", 403);
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new ImagePolicyError("Upload token буруу байна.", 400);
  }
  const age = Date.now() - Number(payload.iat || 0);
  if (!Number.isFinite(age) || age < -5000 || age > UPLOAD_TOKEN_TTL_MS) {
    throw new ImagePolicyError("Upload token-ий хугацаа дууссан. Дахин оруулна уу.", 400);
  }
  return payload;
}

function assertTokenOwner(payload, user) {
  const userId = String(user._id || user.id || "");
  if (!userId || payload.userId !== userId) {
    throw new ImagePolicyError("Өөр хэрэглэгчийн файлд хандах эрхгүй.", 403);
  }
  if (typeof payload.key !== "string" || payload.key.includes("..") || payload.key.includes("\\")) {
    throw new ImagePolicyError("Upload key буруу байна.", 403);
  }
  const expectedPrefix = `staging/${userId}/${payload.purpose}/`;
  if (!payload.key.startsWith(expectedPrefix)) {
    throw new ImagePolicyError("Upload key буруу байна.", 403);
  }
}

function publicPolicy() {
  const out = {};
  for (const [key, policy] of Object.entries(PURPOSES)) {
    out[key] = {
      label: policy.label,
      maxBytes: policy.maxBytes,
      maxWidth: policy.maxWidth,
      maxHeight: policy.maxHeight,
      maxPixels: policy.maxPixels,
      hint: policy.hint,
      allowedMime: ALLOWED_INPUT_MIME,
    };
  }
  return out;
}

module.exports = {
  MiB,
  WEBP_MAX_DIMENSION,
  JPEG_MAX_DIMENSION,
  STRIP_HEIGHT,
  MAX_CONCURRENT_IMAGE_JOBS,
  UPLOAD_TOKEN_TTL_MS,
  PRESIGN_TTL_SEC,
  DIRECT_BODY_SAFE_BYTES,
  ALLOWED_INPUT_MIME,
  PURPOSES,
  ImagePolicyError,
  formatMiB,
  getPurpose,
  assertDeclaredUpload,
  assertRole,
  orientedSize,
  needsOrientationNormalize,
  assertDecodedBounds,
  splitStripPlan,
  createUploadToken,
  readUploadToken,
  assertTokenOwner,
  publicPolicy,
};
