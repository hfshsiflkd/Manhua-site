// config/r2.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

if (
  !process.env.R2_ACCOUNT_ID ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY ||
  !process.env.R2_BUCKET_NAME
) {
  console.warn("⚠️ R2 env тохиргоо дутуу байна.");
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // R2-т x-amz-checksum-mode нийцэхгүй тул тооцоолохгүй
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

/**
 * R2 bucket дахь файлд хандах signed URL үүсгэнэ.
 * Network call хийхгүй — зөвхөн HMAC signature тооцоолно (хурдан).
 * @param {string} key  — bucket-д хадгалагдсан замын нэр, жишээ: "manhua_pages/abc.webp"
 * @param {number} expiresIn — хүчинтэй байх секунд (default 4 цаг)
 */
async function signR2Key(key, expiresIn = 4 * 60 * 60) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * DB-д хадгалагдсан public URL-аас R2 key гаргана.
 * Жишээ: "https://pub-xxx.r2.dev/manhua_pages/abc.webp" → "manhua_pages/abc.webp"
 * Таарахгүй URL бол null буцаана.
 */
function urlToR2Key(url) {
  const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!url || !base) return null;
  if (url.startsWith(base + "/")) return url.slice(base.length + 1);
  return null;
}

module.exports = {
  r2Client,
  PutObjectCommand,
  signR2Key,
  urlToR2Key,
};
