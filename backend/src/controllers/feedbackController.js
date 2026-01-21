const multer = require("multer");
const Feedback = require("../models/Feedback");
const { r2Client, PutObjectCommand } = require("../config/r2");
const { toWebpBuffer, makeWebpKey } = require("../utils/image");

// Use memory storage
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function requireR2Config() {
  return (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_BASE_URL
  );
}

// POST /api/feedback  (multipart/form-data)
// fields: name, type (suggestion_request|complaint), description, image(optional file)
exports.submitFeedback = [
  upload.single("image"),
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
      const bucket = process.env.R2_BUCKET_NAME;
      let converted;
      try {
        converted = await toWebpBuffer(req.file);
      } catch {
        return res.status(400).json({ message: "Зөвхөн зураг файл оруулна уу." });
      }
      const key = makeWebpKey("feedback");
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: converted.buffer,
        ContentType: converted.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      });
      await r2Client.send(command);
      imageUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
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

