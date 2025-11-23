const express = require("express");
const router = express.Router();
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
router.post("/", upload.single("file"), (req, res) => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD ||
      !process.env.CLOUDINARY_KEY ||
      !process.env.CLOUDINARY_SECRET
    ) {
      console.error("Cloudinary config дутуу байна");
      return res
        .status(500)
        .json({ message: "Cloudinary тохиргоо (env) дутуу байна." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Файл ирсэнгүй." });
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: "manhua_pages" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res
            .status(500)
            .json({ message: "Cloudinary upload хийхэд алдаа гарлаа." });
        }

        return res.json({ url: result.secure_url });
      }
    );

    stream.end(req.file.buffer);
  } catch (err) {
    console.error("Upload route error:", err);
    return res
      .status(500)
      .json({ message: "Upload route дээр алдаа гарлаа." });
  }
});

module.exports = router;
