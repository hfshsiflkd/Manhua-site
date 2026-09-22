const SAFE_KEY = /^(manhua_pages|covers|avatars|request_attachments|feedback)\/[A-Za-z0-9._-]+$/;

function publicBase() {
  return String(process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
}

function bucketName() {
  return String(process.env.R2_BUCKET_NAME || "");
}

function canonicalUrl(key) {
  return `${publicBase()}/${key}`;
}

function isSafeKey(key) {
  return SAFE_KEY.test(key);
}

function parseAmzDate(value) {
  const match = String(value || "").match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

function signedUrlExpiryMs(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const start = parseAmzDate(parsed.searchParams.get("X-Amz-Date"));
  const seconds = Number(parsed.searchParams.get("X-Amz-Expires"));
  if (!Number.isFinite(start) || !Number.isFinite(seconds)) return null;
  return start + seconds * 1000;
}

function isSignedUrlExpired(url, now = Date.now()) {
  const expiry = signedUrlExpiryMs(url);
  if (expiry == null) return false;
  return now >= expiry;
}

function keyFromPath(pathname) {
  const path = decodeURIComponent(String(pathname || "").replace(/^\//, ""));
  const bucket = bucketName();
  if (bucket && (path === bucket || path.startsWith(`${bucket}/`))) {
    return path.slice(bucket.length).replace(/^\//, "");
  }
  return path;
}

function classifyImageRef(input) {
  const raw = String(input || "").trim();
  if (!raw) return { action: "reject", reason: "empty" };

  const base = publicBase();
  if (base && (raw === base || raw.startsWith(`${base}/`))) {
    const key = raw.slice(base.length + 1).split("?")[0].split("#")[0];
    if (!isSafeKey(key)) return { action: "uncertain", reason: "public-url-key", value: raw };
    return { action: "store", imageUrl: canonicalUrl(key), key, kind: "r2-public" };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    if (isSafeKey(raw)) {
      return { action: "store", imageUrl: canonicalUrl(raw), key: raw, kind: "key" };
    }
    return { action: "uncertain", reason: "not-a-url", value: raw };
  }

  if (parsed.hostname === "res.cloudinary.com") {
    return { action: "store", imageUrl: raw, kind: "cloudinary" };
  }

  const host = parsed.hostname;
  const looksSigned = parsed.searchParams.has("X-Amz-Signature") || parsed.searchParams.has("X-Amz-Algorithm");
  const r2Host = host.endsWith(".r2.cloudflarestorage.com") || host.endsWith(".r2.dev");
  if (r2Host && looksSigned) {
    const key = keyFromPath(parsed.pathname);
    if (!isSafeKey(key)) return { action: "uncertain", reason: "signed-key", value: raw };
    return { action: "store", imageUrl: canonicalUrl(key), key, kind: "r2-signed" };
  }

  if (looksSigned) return { action: "uncertain", reason: "foreign-signed-url", value: raw };
  return { action: "store", imageUrl: raw, kind: "external" };
}

function canonicalizeImageRef(input) {
  const found = classifyImageRef(input);
  if (found.action !== "store") {
    const err = new Error(
      found.reason === "empty"
        ? "Хуудсын зургийн холбоос дутуу байна."
        : "Зургийн холбоос танигдаагүй тул хадгалсангүй."
    );
    err.statusCode = 400;
    err.reason = found.reason;
    throw err;
  }
  return found;
}

module.exports = {
  classifyImageRef,
  canonicalizeImageRef,
  signedUrlExpiryMs,
  isSignedUrlExpired,
  isSafeKey,
};
