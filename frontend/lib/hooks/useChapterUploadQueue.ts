"use client";

import { useRef, useState } from "react";
import { api, uploadImage } from "@/lib/api";
import { validateImageFile } from "@/lib/imageLimits";
import {
  createIdempotencyKey,
  jobsNeedingUpload,
  pagesInOrder,
  savePages,
  type SessionPage,
  type UploadJobStatus,
} from "@/lib/uploadSession";

export interface QueueJob {
  id: string;
  name: string;
  status: UploadJobStatus;
  progress: number;
  error?: string;
  pages: SessionPage[];
}

function uid() {
  return `job_${Math.random().toString(36).slice(2, 10)}`;
}

export function useChapterUploadQueue(scope?: { manhuaId?: string; slug?: string }) {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const jobsRef = useRef<QueueJob[]>([]);
  const filesRef = useRef(new Map<string, File>());
  const abortRef = useRef(new Map<string, AbortController>());
  const tokenRef = useRef(new Map<string, string>());
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  function setQueue(next: QueueJob[]) {
    jobsRef.current = next;
    setJobs(next);
  }

  function updateJob(id: string, patch: Partial<QueueJob>) {
    setQueue(jobsRef.current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  }

  function addFiles(files: File[]) {
    const next = [...jobsRef.current];
    for (const file of files) {
      const problem = validateImageFile(file, "chapter");
      const id = uid();
      if (!problem) filesRef.current.set(id, file);
      next.push({
        id,
        name: file.name,
        status: problem ? "failed" : "pending",
        progress: 0,
        error: problem || undefined,
        pages: [],
      });
    }
    setQueue(next);
    return next;
  }

  function removeJob(id: string) {
    cancel(id);
    filesRef.current.delete(id);
    tokenRef.current.delete(id);
    setQueue(jobsRef.current.filter((job) => job.id !== id));
  }

  function cancel(id: string) {
    abortRef.current.get(id)?.abort();
    const token = tokenRef.current.get(id);
    const job = jobsRef.current.find((item) => item.id === id);
    if (job && job.status !== "uploaded") {
      updateJob(id, { status: "cancelled", error: "Цуцлагдсан" });
      if (token) api.post("/upload/abort", { token }).catch(() => {});
    }
  }

  async function uploadOne(id: string) {
    const file = filesRef.current.get(id);
    const current = jobsRef.current.find((job) => job.id === id);
    if (!file || !current || current.status === "uploaded" || current.status === "cancelled") return;
    const controller = new AbortController();
    abortRef.current.set(id, controller);
    updateJob(id, { status: "uploading", progress: 0, error: undefined });
    try {
      const result = await uploadImage(
        file,
        (percent) => updateJob(id, { progress: percent, status: "uploading" }),
        "chapter",
        {
          signal: controller.signal,
          onPresign: (token) => tokenRef.current.set(id, token),
          onPhase: (phase) => {
            if (phase === "processing") updateJob(id, { status: "processing", progress: 100 });
          },
          manhuaId: scope?.manhuaId,
          slug: scope?.slug,
        }
      );
      const urls = result.urls?.length ? result.urls : [result.url];
      updateJob(id, {
        status: "uploaded",
        progress: 100,
        pages: urls.map((url, index) => ({
          imageUrl: url,
          originalName: file.name,
          width: result.parts?.[index]?.width,
          height: result.parts?.[index]?.height,
        })),
      });
      tokenRef.current.delete(id);
    } catch (err) {
      const aborted = controller.signal.aborted || (err as { name?: string })?.name === "AbortError";
      if (aborted) {
        updateJob(id, { status: "cancelled", error: "Цуцлагдсан" });
        return;
      }
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      updateJob(id, {
        status: "failed",
        error: error?.response?.data?.message || error?.message || "Upload амжилтгүй",
      });
    } finally {
      abortRef.current.delete(id);
    }
  }

  async function uploadOutstanding() {
    const pendingIds = jobsNeedingUpload(jobsRef.current).map((job) => job.id);
    let cursor = 0;
    async function worker() {
      while (cursor < pendingIds.length) {
        const id = pendingIds[cursor];
        cursor += 1;
        await uploadOne(id);
      }
    }
    await Promise.all([worker(), worker()]);
    const failed = jobsRef.current.filter((job) => job.status === "failed");
    if (failed.length) {
      throw new Error(failed[0].error || "Зарим зураг upload болоогүй");
    }
  }

  async function commit(put: (pages: ReturnType<typeof pagesInOrder>, idempotencyKey: string) => Promise<void>) {
    const pages = pagesInOrder(jobsRef.current);
    if (!pages.length) throw new Error("Хадгалах зураг алга");
    const result = await savePages(() => put(pages, idempotencyKeyRef.current));
    if (!result.ok) throw new Error(result.message);
    idempotencyKeyRef.current = createIdempotencyKey();
  }

  return {
    jobs,
    addFiles,
    removeJob,
    cancel,
    uploadOutstanding,
    commit,
    pages: () => pagesInOrder(jobsRef.current),
  };
}
