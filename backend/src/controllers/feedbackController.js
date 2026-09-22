const multer = require("multer");
const Feedback = require("../models/Feedback");
const { processImage } = require("../utils/image");
const { createImageUploadService } = require("../services/imageUploadService");
const { getPurpose, ImagePolicyError } = require("../utils/imagePolicy");

const feedbackPolicy = getPurpose("feedback");
const uploadService = createImageUploadService();

// Vercel body 4MiB хүртэл хүрдэг тул шууд multipart-ыг энэ хязгаарт барина.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: feedbackPolicy.maxBytes },
});

function requireR2Config() {
  return (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_BASE_URL
  );
}

function uploadFeedback(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Зураг хэт том байна. Санал хүсэлтийн зураг 4MB хүртэл.",
      });
    }
    if (err) {
      return res.status(400).json({ message: "Зураг оруулахад алдаа гарлаа." });
    }
    return next();
  });
}

// POST /api/feedback  (multipart/form-data)
// fields: name, type (suggestion_request|complaint), description, image(optional file)
exports.submitFeedback = [
  uploadFeedback,
  async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const type = String(req.body?.type || "").trim();
    const description = String(req.body?.description || "").trim();

    if (!name) return res.status(400).json({ message: "Нэрээ оруулна уу." });
    if (!description) {
      return res.status(400).json({ message: "Дэлгэрэнгүй тайлбар оруулна уу." });
    }
    if (!["suggestion_request", "complaint"].includes(type)) {
      return res.status(400).json({ message: "Төрөл буруу байна." });
    }

    let imageUrl = "";
    if (req.file) {
      if (!requireR2Config()) {
        return res.status(500).json({ message: "R2 тохиргоо (env) дутуу байна." });
      }
      let processed;
      try {
        processed = await processImage(req.file.buffer, "feedback");
      } catch (err) {
        const message =
          err instanceof ImagePolicyError
            ? err.message
            : "Зөвхөн зураг файл оруулна уу.";
        return res.status(err.statusCode || 400).json({ message });
      }
      const parts = await uploadService.publishProcessed(processed, "feedback");
      imageUrl = parts[0].url;
    }

    const doc = await Feedback.create({
      type,
      name,
      description,
      imageUrl,
      status: "new",
    });

    return res.status(201).json({
      success: true,
      id: doc._id,
    });
  },
];

