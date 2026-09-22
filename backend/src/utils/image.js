const sharp = require("sharp");
const { randomBytes } = require("crypto");
const {
  ImagePolicyError,
  MAX_CONCURRENT_IMAGE_JOBS,
  WEBP_MAX_DIMENSION,
  PURPOSES,
  assertDecodedBounds,
  needsOrientationNormalize,
  splitStripPlan,
} = require("./imagePolicy");

/**
 * Зургийн бодлого:
 * - EXIF orientation-ийг pixel дээр буулгаад дараа нь metadata-г хаяна. Viewer бүрт адил харагдана.
 * - Alpha-г цагаан дэвсгэр болгож хавтгайлахгүй. Chapter passthrough болон WebP alpha-г хадгална.
 * - Олон кадртай GIF/WebP болон GIF-ийг авна. Хөдөлгөөнгүй PNG, JPEG, WebP л зөвшөөрнө.
 * - Chapter: хэмжээ багтвал эх файлыг дахин шахалгүй хадгална. EXIF засах эсвэл WebP-ийн
 *   16383px-ээс өндөр бол өргөнийг хэвээр үлдээн lossless WebP зурвас болгоно.
 * - Cover/avatar/request/feedback: тусад нь fit-inside resize. Chapter-ийн longest-side scale биш.
 * - limitInputPixels нь purpose-ийн maxPixels. Хязгааргүй false үлдээхгүй.
 */

let activeJobs = 0;
const waiters = [];

function withImageSlot(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeJobs += 1;
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          activeJobs -= 1;
          const next = waiters.shift();
          if (next) next();
        });
    };
    if (activeJobs < MAX_CONCURRENT_IMAGE_JOBS) run();
    else waiters.push(run);
  });
}

function mimeForFormat(format) {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return null;
}

function sharpOptions(pixelLimit) {
  return {
    failOn: "error",
    limitInputPixels: pixelLimit,
    sequentialRead: true,
  };
}

async function readMetadata(buffer, pixelLimit) {
  try {
    return await sharp(buffer, sharpOptions(pixelLimit)).metadata();
  } catch (err) {
    const msg = String(err && err.message ? err.message : "");
    if (/pixel limit|exceeds pixel/i.test(msg)) {
      throw new ImagePolicyError(
        "Зургийн пикселийн хэмжээ хэт их байна. Зөвшөөрөгдсөн хэмжээнээс бага зураг оруулна уу."
      );
    }
    throw new ImagePolicyError("Зургийн файл гэмтсэн эсвэл дэмжигдэхгүй форматтай байна.");
  }
}

function canStoreOriginal(meta, oriented) {
  if (needsOrientationNormalize(meta)) return false;
  const mime = mimeForFormat(meta.format);
  if (!mime) return false;
  if (meta.format === "webp") {
    return oriented.width <= WEBP_MAX_DIMENSION && oriented.height <= WEBP_MAX_DIMENSION;
  }
  return oriented.width <= 65535 && oriented.height <= 65535;
}

async function encodeLosslessParts(buffer, pixelLimit) {
  let normalized;
  try {
    normalized = await sharp(buffer, sharpOptions(pixelLimit))
      .rotate()
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
  } catch (err) {
    const msg = String(err && err.message ? err.message : "");
    if (/pixel limit|exceeds pixel/i.test(msg)) {
      throw new ImagePolicyError(
        "Зургийн пикселийн хэмжээ хэт их байна. Зөвшөөрөгдсөн хэмжээнээс бага зураг оруулна уу."
      );
    }
    throw new ImagePolicyError("Зургийн файл гэмтсэн эсвэл дэмжигдэхгүй форматтай байна.");
  }

  const width = normalized.info.width;
  const height = normalized.info.height;
  if (!width || !height) {
    throw new ImagePolicyError("Зургийн хэмжээг уншиж чадсангүй.");
  }
  if (width > WEBP_MAX_DIMENSION) {
    throw new ImagePolicyError(
      `Зургийн өргөн хэт их байна (${width}px). Дээд өргөн ${WEBP_MAX_DIMENSION}px.`
    );
  }

  const webpOpts = { lossless: true, effort: 4, alphaQuality: 100 };
  if (height <= WEBP_MAX_DIMENSION) {
    const out = await sharp(normalized.data).webp(webpOpts).toBuffer();
    return {
      width,
      height,
      parts: [
        {
          buffer: out,
          contentType: "image/webp",
          width,
          height,
          storage: "lossless-webp",
        },
      ],
    };
  }

  const plan = splitStripPlan(height);
  const parts = [];
  for (const part of plan) {
    const strip = await sharp(normalized.data)
      .extract({ left: 0, top: part.top, width, height: part.height })
      .webp(webpOpts)
      .toBuffer();
    parts.push({
      buffer: strip,
      contentType: "image/webp",
      width,
      height: part.height,
      storage: "lossless-webp-strip",
    });
  }
  return { width, height, parts };
}

async function encodeFit(buffer, policy) {
  try {
    const out = await sharp(buffer, sharpOptions(policy.maxPixels))
      .rotate()
      .resize({
        width: policy.fitWidth,
        height: policy.fitHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: policy.quality, effort: 4, alphaQuality: 100 })
      .toBuffer({ resolveWithObject: true });
    return {
      width: out.info.width,
      height: out.info.height,
      parts: [
        {
          buffer: out.data,
          contentType: "image/webp",
          width: out.info.width,
          height: out.info.height,
          storage: "fit-webp",
        },
      ],
    };
  } catch (err) {
    if (err instanceof ImagePolicyError) throw err;
    const msg = String(err && err.message ? err.message : "");
    if (/pixel limit|exceeds pixel/i.test(msg)) {
      throw new ImagePolicyError(
        "Зургийн пикселийн хэмжээ хэт их байна. Зөвшөөрөгдсөн хэмжээнээс бага зураг оруулна уу."
      );
    }
    throw new ImagePolicyError("Зургийн файл гэмтсэн эсвэл дэмжигдэхгүй форматтай байна.");
  }
}

async function processImage(buffer, purpose) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImagePolicyError("Файл ирсэнгүй.");
  }
  const policy = PURPOSES[purpose];
  if (!policy) {
    throw new ImagePolicyError("Зургийн төрөл буруу байна.");
  }
  if (buffer.length > policy.maxBytes) {
    throw new ImagePolicyError(
      `Файл хэт том байна. ${policy.label} дээд тал нь ${(policy.maxBytes / (1024 * 1024)).toFixed(0)}MB.`
    );
  }

  return withImageSlot(async () => {
    const meta = await readMetadata(buffer, policy.maxPixels);
    const oriented = assertDecodedBounds(meta, purpose);

    if (policy.mode === "chapter" && canStoreOriginal(meta, oriented)) {
      const contentType = mimeForFormat(meta.format);
      return {
        width: oriented.width,
        height: oriented.height,
        parts: [
          {
            buffer,
            contentType,
            width: oriented.width,
            height: oriented.height,
            storage: "original",
          },
        ],
      };
    }

    if (policy.mode === "chapter") {
      const encoded = await encodeLosslessParts(buffer, policy.maxPixels);
      if (
        encoded.width > policy.maxWidth ||
        encoded.height > policy.maxHeight ||
        encoded.width * encoded.height > policy.maxPixels
      ) {
        throw new ImagePolicyError(
          `Зургийн хэмжээ хэт их байна (${encoded.width}×${encoded.height}).`
        );
      }
      return encoded;
    }

    return encodeFit(buffer, policy);
  });
}

function extensionFor(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  return "webp";
}

function makeObjectKey(folder, contentType, suffix = "") {
  const ext = extensionFor(contentType);
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${suffix}.${ext}`;
  return `${folder}/${filename}`;
}

module.exports = {
  processImage,
  encodeLosslessParts,
  makeObjectKey,
  extensionFor,
  withImageSlot,
};
