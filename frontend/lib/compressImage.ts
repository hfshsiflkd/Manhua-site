// frontend/lib/compressImage.ts
// Browser-side зураг шахах (Vercel-ийн 4.5MB body limit-аас давахгүй).
// Том PNG → жижигрүүлээд JPEG/WebP болгож үр дүнг буцаана.

export interface CompressOptions {
  /** Хамгийн их өргөн/өндөр (px). Default 2400. */
  maxDimension?: number;
  /** JPEG/WebP чанар 0.0–1.0. Default 0.85. */
  quality?: number;
  /** Гаралтын форматыг тохируулах. Default "image/webp" (унтсан тохиолдолд "image/jpeg"). */
  preferredType?: "image/webp" | "image/jpeg";
  /** Файлыг шахах хязгаар. Энэ хэмжээнээс жижиг файлыг хөндөхгүй (хэрэв format нь image/* бол). Default 1MB. */
  skipIfSmallerThan?: number;
}

/** Browser canvas → blob (Promise). */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas to blob failed"));
      },
      type,
      quality
    );
  });
}

/** File → HTMLImageElement (loaded). */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      // URL-ийг ачаалсны дараа цэвэрлэнэ
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Error ? e : new Error("Image load failed"));
    };
    img.src = url;
  });
}

/** Browser webp дэмждэг үү — type sniffing-р шалгах. */
function supportsWebp(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Зургийн файлыг шахах.
 * - Хэмжээг maxDimension-аас давахгүй болгож resize
 * - Format → webp (browser supported) эсвэл jpeg
 * - Шинэ File буцаана (.webp эсвэл .jpg extension-тэй)
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxDimension = 2400,
    quality = 0.85,
    preferredType,
    skipIfSmallerThan = 1024 * 1024, // 1MB
  } = options;

  if (!file.type.startsWith("image/")) {
    return file; // зураг биш — гар хүрэхгүй
  }

  // Хэт жижиг бол шахах хэрэггүй
  if (file.size <= skipIfSmallerThan) {
    return file;
  }

  // GIF-ийг шахах нь анимэйшн алдагдуулна — хийхгүй
  if (file.type === "image/gif") {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await fileToImage(file);
  } catch {
    return file; // ачаалж чадахгүй бол анхных нь буцаана
  }

  const { width: w0, height: h0 } = img;
  if (!w0 || !h0) return file;

  const scale = Math.min(1, maxDimension / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // PNG-ийн ил тод дэвсгэр алдагдуулахгүйн тулд WebP-г сонгоно (alpha дэмждэг)
  // Browser webp-ийг дэмждэггүй бол JPEG fallback (alpha-г цагаан болгож шахна)
  ctx.drawImage(img, 0, 0, w, h);

  const targetType =
    preferredType ?? (supportsWebp() ? "image/webp" : "image/jpeg");

  let blob: Blob;
  try {
    blob = await canvasToBlob(canvas, targetType, quality);
  } catch {
    return file;
  }

  // Шинэ файл нь анхных нь том бол анхныхаа буцаана (overhead-аас сэргийлж)
  if (blob.size >= file.size) return file;

  const ext = targetType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const newName = `${baseName}.${ext}`;
  return new File([blob], newName, { type: targetType, lastModified: Date.now() });
}
