const multer = require("multer");
const Feedback = require("../models/Feedback");
const { r2Client, PutObjectCommand } = require("../config/r2");

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

function makeKey(folder, originalname) {
  const ext = String(originalname || "png").split(".").pop();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  return `${folder}/${filename}`;
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
      const key = makeKey("feedback", req.file.originalname);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
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

