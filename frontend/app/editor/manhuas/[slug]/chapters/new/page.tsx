/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

export default function EditorNewChapterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    if (!slug) {
      const message = "Manhua slug олдсонгүй";
      setError(message);
      toast.error(message);
      return;
    }
    if (!files || files.length === 0) {
      const message = "Ядаж нэг зураг сонгоно уу";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);
      setUploadPhase("uploading");

      // Upload all images
      const fileArr = Array.from(files);
      setUploadingIndex(0);
      setUploadTotal(fileArr.length);
      const uploadedUrls: string[] = [];
      for (const [index, file] of fileArr.entries()) {
        setUploadingIndex(index + 1);
        const result = await uploadImage(file, (percent) => {
          const overall = Math.round(
            ((index + percent / 100) / fileArr.length) * 100
          );
          setUploadProgress(Math.min(100, Math.max(0, overall)));
        });
        uploadedUrls.push((result as any).url);
      }
      setUploadProgress(100);
      setUploadPhase("creating");

      if (!uploadedUrls.length) {
        const message = "Зураг upload болоогүй байна";
        setError(message);
        toast.error(message);
        return;
      }

      // Create pages array
      const pages: ChapterPageInput[] = uploadedUrls.map((url, idx) => ({
        pageNumber: idx + 1,
        imageUrl: url,
        originalName: fileArr[idx]?.name || undefined,
      }));

      await api.post(`/editor/manhuas/${slug}/chapters`, {
        chapterNumber,
        title,
        pages,
        language: "mn",
        status,
      });

      toast.success("Chapter амжилттай үүслээ");
      router.push(`/editor/manhuas/${slug}/chapters`);
    } catch (e: any) {
      console.error(e);
      const message =
        e?.response?.data?.message ||
          "Шинэ chapter үүсгэхэд алдаа гарлаа"
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
      setUploadingIndex(0);
      setUploadTotal(0);
      setUploadPhase("idle");
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              ← Chapters
            </button>
            <span className="text-sm text-slate-400">/</span>
            <span className="text-sm font-mono text-slate-300">{slug}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">
            Шинэ Chapter
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Шинэ chapter үүсгэж, зургуудыг upload хийх.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          {/* Left - Metadata */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Chapter мэдээлэл
            </h2>
            <div className="space-y-4">
              {/* Chapter Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Chapter number
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  value={chapterNumber}
                  onChange={(e) => {
                    const next = e.currentTarget.valueAsNumber;
                    setChapterNumber(Number.isNaN(next) ? 0 : next);
                  }}
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Chapter title
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Жишээ: First Encounter"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Status
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
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
          </section>

          {/* Right - Images */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Зургийн файлууд
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Зургууд (олон сонгож болно)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-400 transition"
                />
                {files && files.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Сонгосон {files.length} зураг – дарааллаар нь page 1..N
                    болж орно.
                  </p>
                )}
              </div>

              {/* Preview */}
              {files && files.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-medium text-slate-300 mb-2">
                    Сонгосон зургууд ({files.length}):
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from(files).slice(0, 8).map((file, idx) => (
                      <div
                        key={idx}
                        className="aspect-square overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {files.length > 8 && (
                    <p className="text-xs text-slate-500 mt-2">
                      +{files.length - 8} илүү зураг...
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Action Bar - Desktop Sticky, Mobile Fixed Bottom */}
        <div className="hidden lg:flex sticky bottom-6 items-center justify-end gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-xl backdrop-blur-sm">
          <button
            type="button"
            disabled={submitting}
            onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
          >
            Цуцлах
          </button>
          <button
            type="submit"
            disabled={submitting || !files?.length}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Үүсгэж байна..." : "Chapter үүсгэх"}
          </button>
        </div>
        
        {/* Mobile Action Bar - Fixed Bottom */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-slate-800 bg-slate-950/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="flex gap-3 max-w-7xl mx-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={submitting || !files?.length}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Үүсгэж байна..." : "Үүсгэх"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
