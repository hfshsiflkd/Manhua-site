// routes/uploadRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { r2Client, PutObjectCommand } = require("../config/r2");
const { toWebpBuffer, makeWebpKey } = require("../utils/image");
const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  // PNG өндөр чанартай файлууд том байж болзошгүй тул 25MB-аар тохируулсан.
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Multer-ийн алдааг (file size, multer fields, etc.) front-руу тодорхой буцаах
function multerErrorHandler(err, req, res, next) {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message: `Файл хэт том байна (max ${25}MB). Жижиг хэмжээтэйгээр оруулна уу.`,
    });
  }
  if (err && err.name === "MulterError") {
    return res
      .status(400)
      .json({ message: `Upload алдаа: ${err.message}` });
  }
  return next(err);
}

// Multer-ыг wrap хийж file-size алдааг тодорхой барина
function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) return multerErrorHandler(err, req, res, next);
    next();
  });
}

// POST /api/upload — editor/translator/admin зураг оруулж болно
router.post("/", protect, requireRole("editor", "translator", "admin"), uploadSingle, async (req, res) => {
  const log = (...args) => console.log("[upload]", ...args);
  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    log(reqId, "START", {
      userId: req.user?._id ? String(req.user._id) : "no-user",
      userRole: req.user?.role,
      hasFile: !!req.file,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
    });

    if (
      !process.env.R2_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET_NAME ||
      !process.env.R2_PUBLIC_BASE_URL
    ) {
      log(reqId, "❌ R2 ENV missing", {
        hasAccountId: !!process.env.R2_ACCOUNT_ID,
        hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
        hasSecret: !!process.env.R2_SECRET_ACCESS_KEY,
        hasBucket: !!process.env.R2_BUCKET_NAME,
        hasPublicBase: !!process.env.R2_PUBLIC_BASE_URL,
      });
      return res
        .status(500)
        .json({ message: "R2 тохиргоо (env) дутуу байна." });
    }

    if (!req.file) {
      log(reqId, "❌ NO FILE");
      return res.status(400).json({ message: "Файл ирсэнгүй." });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const folder = "manhua_pages";
    let converted;
    try {
      converted = await toWebpBuffer(req.file);
    } catch (e) {
      log(reqId, "❌ toWebpBuffer failed", {
        error: e?.message,
        cause: e?.cause?.message,
        mimetype: req.file?.mimetype,
        size: req.file?.size,
        originalName: req.file?.originalname,
      });
      return res.status(400).json({
        message: `Зураг хөрвүүлж чадсангүй: ${e?.message || "тодорхойгүй алдаа"}`,
      });
    }
    const { buffer, contentType } = converted;
    const key = makeWebpKey(folder);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await r2Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
    log(reqId, "✅ UPLOADED", { key, sizeAfter: buffer.length });

    return res.json({ url: publicUrl });
  } catch (err) {
    log(reqId, "❌ R2 upload error", {
      name: err?.name,
      message: err?.message,
      code: err?.code,
    });
    return res.status(500).json({ message: "R2 upload хийхэд алдаа гарлаа." });
  }
});

module.exports = router;
