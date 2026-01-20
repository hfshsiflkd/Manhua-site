/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/manhuas/[slug]/chapters/new/page.tsx
"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";

interface ChapterPageInput {
  pageNumber: number;
  imageUrl: string;
  originalName?: string;
}

export default function AdminNewChapterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [files, setFiles] = useState<FileList | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number>(0);
  const [uploadTotal, setUploadTotal] = useState<number>(0);
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "uploading" | "creating"
  >("idle");
  const toast = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!slug) {
      toast.error("Manhua slug олдсонгүй");
      return;
    }
    if (!files || files.length === 0) {
      toast.error("Ядаж нэг зураг сонгоно уу");
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);
      setUploadPhase("uploading");

      // 1) Бүх зургийг дарааллаар нь uploadImage() ашиглаж Cloudinary руу upload хийх
      const fileArr = Array.from(files);
      setUploadingIndex(0);
      setUploadTotal(fileArr.length);
      const uploadedUrls: string[] = [];
      for (const [index, file] of fileArr.entries()) {
        setUploadingIndex(index + 1);
        // uploadImage → POST /api/upload  (field name: "image")
        const result = await uploadImage(file, (percent) => {
          const overall = Math.round(
            ((index + percent / 100) / fileArr.length) * 100
          );
          setUploadProgress(Math.min(100, Math.max(0, overall)));
        }); // { url }
        uploadedUrls.push((result as any).url);
      }
      setUploadProgress(100);
      setUploadPhase("creating");

      if (!uploadedUrls.length) {
        toast.error("Зураг upload болоогүй байна");
        return;
      }

      // 2) Pages массив бэлдэх (1..N)
      const pages: ChapterPageInput[] = uploadedUrls.map((url, idx) => ({
        pageNumber: idx + 1,
        imageUrl: url,
        originalName: fileArr[idx]?.name || undefined,
      }));

      // 3) ADMIN chapter create endpoint руу POST
      await api.post(`/admin/manhuas/${slug}/chapters`, {
        chapterNumber,
        title,
        pages,
        language: "mn",
        status, // "published" эсвэл "draft"
      });

      toast.success("Chapter амжилттай үүслээ");
      // 4) Амжилттай бол chapter list рүү буцаах
      router.push(`/admin/manhuas/${slug}/chapters`);
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.response?.data?.message ||
          "Шинэ chapter үүсгэхэд алдаа гарлаа (admin)"
      );
    } finally {
      setSubmitting(false);
      setUploadingIndex(0);
      setUploadTotal(0);
      setUploadPhase("idle");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 pb-8 pt-3 text-xs text-slate-100 sm:px-4">
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-[11px] text-slate-200 shadow-xl shadow-black/50">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-medium">
                {uploadPhase === "creating"
                  ? "Chapter үүсгэж байна..."
                  : `Upload хийж байна (${uploadingIndex}/${uploadTotal})`}
              </span>
              <span className="font-mono text-slate-100">
                {uploadPhase === "creating"
                  ? "100%"
                  : `${uploadProgress ?? 0}%`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-[width] duration-200"
                style={{
                  width:
                    uploadPhase === "creating"
                      ? "100%"
                      : `${uploadProgress ?? 0}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Цонх хаахгүй, upload дуусах хүртэл хүлээнэ үү.
            </p>
          </div>
        </div>
      )}
      {/* HEADER */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold sm:text-base">
            Шинэ chapter нэмэх
          </h1>
          <p className="text-[11px] text-slate-400 sm:text-xs">
            Manhua:{" "}
            <span className="font-mono text-slate-200">
              {slug || "(slug байхгүй)"}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
          className="self-start rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300 sm:self-auto"
        >
          Chapter жагсаалт руу буцах
        </button>
      </div>

      {/* FORM CARD */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-lg shadow-black/50"
      >
        {/* row: chapter number + status */}
        <div className="grid gap-3 sm:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Chapter number</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={chapterNumber}
              onChange={(e) => {
                const next = e.currentTarget.valueAsNumber;
                setChapterNumber(Number.isNaN(next) ? 0 : next);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Status</label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "published" | "draft")
              }
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* title */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">Chapter title</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
            placeholder="Жишээ: First Encounter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* files */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">
            Зургийн файлууд (олон сонгож болно)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1 file:text-[11px] file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
          />
          {files && files.length > 0 && (
            <p className="text-[10px] text-slate-400">
              Сонгосон {files.length} зураг – дарааллаар нь page 1..N болж орно.
            </p>
          )}
        </div>

        {/* submit */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
          >
            Цуцлах
          </button>
          <button
            type="submit"
            disabled={submitting || !files?.length}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-1.5 text-[11px] font-semibold text-slate-950 shadow shadow-emerald-500/40 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {submitting ? "Үүсгэж байна..." : "Chapter үүсгэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
