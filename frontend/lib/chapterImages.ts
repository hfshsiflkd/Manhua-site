import { uploadImage, type UploadedImage } from "@/lib/api";
import { validateImageFile } from "@/lib/imageLimits";
import type { SessionPage } from "@/lib/uploadSession";

export interface UploadedChapterPage {
  imageUrl: string;
  originalName: string;
  width?: number;
  height?: number;
}

export type ChapterFilePhase = "uploading" | "processing";

export async function ensureChapterUpload(
  file: File,
  already: SessionPage[] | undefined,
  hooks?: {
    signal?: AbortSignal;
    onPhase?: (phase: "uploading" | "processing") => void;
    onProgress?: (percent: number) => void;
    onPresign?: (token: string) => void;
  }
): Promise<SessionPage[]> {
  if (already && already.length) return already;
  const result: UploadedImage = await uploadImage(file, hooks?.onProgress, "chapter", {
    signal: hooks?.signal,
    onPhase: hooks?.onPhase,
    onPresign: hooks?.onPresign,
  });
  const urls = result.urls?.length ? result.urls : [result.url];
  return urls.map((url, index) => ({
    imageUrl: url,
    originalName: file.name,
    width: result.parts?.[index]?.width,
    height: result.parts?.[index]?.height,
  }));
}

export async function uploadFilesAsPages(
  files: File[],
  onFile?: (index: number, total: number, phase: ChapterFilePhase, filePercent: number) => void
): Promise<UploadedChapterPage[]> {
  const pages: UploadedChapterPage[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const problem = validateImageFile(file, "chapter");
    if (problem) throw new Error(problem);
    onFile?.(index, files.length, "uploading", 0);
    const result: UploadedImage = await uploadImage(
      file,
      (percent) => onFile?.(index, files.length, "uploading", percent),
      "chapter",
      {
        onPhase: (phase) =>
          onFile?.(index, files.length, phase, phase === "processing" ? 100 : 0),
      }
    );
    const urls = result.urls?.length ? result.urls : [result.url];
    urls.forEach((url, partIndex) => {
      pages.push({
        imageUrl: url,
        originalName: file.name,
        width: result.parts?.[partIndex]?.width,
        height: result.parts?.[partIndex]?.height,
      });
    });
  }
  return pages;
}

export function uploadPhaseLabel(
  phase: "idle" | "uploading" | "processing" | "saving" | "creating",
  index: number,
  total: number
) {
  if (phase === "processing") return `Зураг шалгаж байна (${index}/${total})`;
  if (phase === "saving" || phase === "creating") return "Хадгалж байна…";
  if (phase === "uploading") return `Хуулж байна (${index}/${total})`;
  return "";
}
