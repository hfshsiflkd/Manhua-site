export type UploadJobStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "uploaded"
  | "failed"
  | "cancelled";

export interface SessionPage {
  imageUrl: string;
  originalName?: string;
  width?: number;
  height?: number;
  sourceUrl?: string;
}

export interface SessionJob {
  id: string;
  status: UploadJobStatus;
  pages: SessionPage[];
}

export function jobsNeedingUpload<T extends SessionJob>(jobs: T[]) {
  return jobs.filter((job) => job.status === "pending" || job.status === "failed");
}

export function pagesInOrder<T extends SessionJob>(jobs: T[]) {
  const pages: Array<SessionPage & { pageNumber: number }> = [];
  jobs.forEach((job) => {
    if (job.status !== "uploaded") return;
    job.pages.forEach((page) => {
      pages.push({
        ...page,
        imageUrl: page.sourceUrl || page.imageUrl,
        pageNumber: pages.length + 1,
      });
    });
  });
  return pages;
}

export async function savePages(put: () => Promise<void>) {
  try {
    await put();
    return { ok: true as const };
  } catch (err) {
    const error = err as { response?: { data?: { message?: string } }; message?: string };
    return {
      ok: false as const,
      message: error?.response?.data?.message || error?.message || "Хадгалах явцад алдаа гарлаа",
    };
  }
}

export function createIdempotencyKey() {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID().replace(/-/g, "");
  return `idem${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
