export type ImagePurpose = "chapter" | "cover" | "avatar" | "request" | "feedback";

const MiB = 1024 * 1024;

export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export const IMAGE_PURPOSES: Record<
  ImagePurpose,
  {
    label: string;
    maxBytes: number;
    hint: string;
  }
> = {
  chapter: {
    label: "Бүлгийн хуудас",
    maxBytes: 25 * MiB,
    hint: "PNG, JPEG, WebP. Нэг файл 25MB хүртэл. Өргөн 4096px, өндөр 65535px хүртэл. Урт зургийн өргөнийг багасгахгүй.",
  },
  cover: {
    label: "Хавтас",
    maxBytes: 8 * MiB,
    hint: "PNG, JPEG, WebP. 8MB хүртэл. Хавтас 1600×2400px дотор багтааж хадгална.",
  },
  avatar: {
    label: "Профайл зураг",
    maxBytes: 5 * MiB,
    hint: "PNG, JPEG, WebP. 5MB хүртэл. 512×512px дотор багтааж хадгална.",
  },
  request: {
    label: "Хүсэлтийн хавсралт",
    maxBytes: 8 * MiB,
    hint: "PNG, JPEG, WebP. 8MB хүртэл. 2000×2000px дотор багтааж хадгална.",
  },
  feedback: {
    label: "Санал хүсэлтийн зураг",
    maxBytes: 4 * MiB,
    hint: "PNG, JPEG, WebP. 4MB хүртэл. 2000×2000px дотор багтааж хадгална.",
  },
};

export const IMAGE_FILE_ACCEPT = "image/png,image/jpeg,image/webp";

export function validateImageFile(file: File, purpose: ImagePurpose): string | null {
  const policy = IMAGE_PURPOSES[purpose];
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!ALLOWED_IMAGE_MIME.includes(type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    return "Зөвхөн PNG, JPEG, WebP зураг оруулна уу. Хөдөлгөөнт зураг дэмжихгүй.";
  }
  if (file.size > policy.maxBytes) {
    const limit = (policy.maxBytes / MiB).toFixed(0);
    const actual = (file.size / MiB).toFixed(1);
    return `Файл хэт том байна (${actual}MB). ${policy.label} дээд тал нь ${limit}MB.`;
  }
  return null;
}
