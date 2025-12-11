// routes/uploadRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { r2Client, PutObjectCommand } = require("../config/r2");

// multer: файл memory дээр авна
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (
      !process.env.R2_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET_NAME ||
      !process.env.R2_PUBLIC_BASE_URL
    ) {
      console.error("R2 config дутуу байна");
      return res
        .status(500)
        .json({ message: "R2 тохиргоо (env) дутуу байна." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Файл ирсэнгүй." });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const folder = "manhua_pages";

    const ext = req.file.originalname.split(".").pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await r2Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;

    return res.json({ url: publicUrl });
  } catch (err) {
    console.error("R2 upload error:", err);
    return res.status(500).json({ message: "R2 upload хийхэд алдаа гарлаа." });
  }
});

module.exports = router;
