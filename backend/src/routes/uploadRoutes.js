// routes/uploadRoutes.js
const express = require("express");
const multer = require("multer");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { createImageUploadService } = require("../services/imageUploadService");
const { processImage } = require("../utils/image");
const {
  ImagePolicyError,
  DIRECT_BODY_SAFE_BYTES,
  publicPolicy,
  getPurpose,
} = require("../utils/imagePolicy");

const router = express.Router();
const uploadService = createImageUploadService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function sendError(res, err) {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) {
    console.error("upload error:", err.message);
  }
  const message =
    err instanceof ImagePolicyError || status < 500
      ? err.message
      : "Зураг боловсруулахад алдаа гарлаа.";
  const body = { message };
  if (err.code) body.code = err.code;
  if (err.quota) body.quota = err.quota;
  return res.status(status).json(body);
}

function multerErrorHandler(err, req, res, next) {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message: "Файл хэт том байна (max 25MB). Жижиг хэмжээтэйгээр оруулна уу.",
    });
  }
  if (err && err.name === "MulterError") {
    return res.status(400).json({ message: `Upload алдаа: ${err.message}` });
  }
  return next(err);
}

function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) return multerErrorHandler(err, req, res, next);
    next();
  });
}

router.get("/limits", (req, res) => {
  res.json(publicPolicy());
});

router.post("/presign", protect, async (req, res) => {
  try {
    const data = await uploadService.presign({
      user: req.user,
      purpose: req.body?.purpose,
      contentType: req.body?.contentType,
      contentLength: req.body?.contentLength,
      fileName: req.body?.fileName,
    });
    return res.json(data);
  } catch (err) {
    return sendError(res, err);
  }
});

router.post("/abort", protect, async (req, res) => {
  try {
    const data = await uploadService.abortStaging({
      user: req.user,
      token: req.body?.token,
    });
    return res.json(data);
  } catch (err) {
    return sendError(res, err);
  }
});

router.post("/finalize", protect, async (req, res) => {
  try {
    const data = await uploadService.finalize({
      user: req.user,
      token: req.body?.token,
    });
    return res.json(data);
  } catch (err) {
    return sendError(res, err);
  }
});

// Хуучин multipart зам. Vercel 4.5MB-аас дээш body-г платформ 413-аар тасалдаг.
// 25MB chapter зураг шинэ presign/finalize замаар орно.
router.post(
  "/",
  protect,
  requireRole("editor", "translator", "admin"),
  uploadSingle,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Файл ирсэнгүй." });
      }
      const purpose = req.body?.purpose || "chapter";
      if (purpose !== "chapter" && purpose !== "cover") {
        return res.status(400).json({
          message: "Энэ зам зөвхөн бүлэг болон хавтасны зурагт. Бусад төрөл presign ашиглана.",
        });
      }
      const policy = getPurpose(purpose);
      if (req.file.size > policy.maxBytes) {
        return res.status(413).json({
          message: `Файл хэт том байна. ${policy.label} дээд тал нь ${(policy.maxBytes / (1024 * 1024)).toFixed(0)}MB.`,
        });
      }
      if (req.file.size > DIRECT_BODY_SAFE_BYTES) {
        return res.status(413).json({
          message:
            "Энэ хэмжээний файлыг шууд илгээх боломжгүй. Хуудас шинэчлээд дахин оруулна уу.",
        });
      }
      const processed = await processImage(req.file.buffer, purpose);
      const parts = await uploadService.publishProcessed(processed, purpose);
      return res.json({
        url: parts[0].url,
        urls: parts.map((part) => part.url),
        width: processed.width,
        height: processed.height,
        parts,
      });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

module.exports = router;
