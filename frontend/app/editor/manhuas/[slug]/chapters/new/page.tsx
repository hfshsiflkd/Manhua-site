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
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "creating">("idle");
  const toast = useToast();

  const fieldStyle: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)", borderRadius: 9, padding: "10px 16px", fontSize: 13, outline: "none", width: "100%" };
  const btnBase: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!slug) { const m = "Manhua slug олдсонгүй"; setError(m); toast.error(m); return; }
    if (!files || files.length === 0) { const m = "Ядаж нэг зураг сонгоно уу"; setError(m); toast.error(m); return; }
    try {
      setSubmitting(true); setUploadProgress(0); setUploadPhase("uploading");
      const fileArr = Array.from(files);
      setUploadingIndex(0); setUploadTotal(fileArr.length);
      const uploadedUrls: string[] = [];
      for (const [index, file] of fileArr.entries()) {
        setUploadingIndex(index + 1);
        const result = await uploadImage(file, (p) => setUploadProgress(Math.min(100, Math.max(0, Math.round(((index + p / 100) / fileArr.length) * 100)))));
        uploadedUrls.push((result as any).url);
      }
      setUploadProgress(100); setUploadPhase("creating");
      if (!uploadedUrls.length) { const m = "Зураг upload болоогүй байна"; setError(m); toast.error(m); return; }
      const pages: ChapterPageInput[] = uploadedUrls.map((url, idx) => ({ pageNumber: idx + 1, imageUrl: url, originalName: fileArr[idx]?.name }));
      await api.post(`/editor/manhuas/${slug}/chapters`, { chapterNumber, title, pages, language: "mn", status });
      toast.success("Chapter амжилттай үүслээ");
      router.push(`/editor/manhuas/${slug}/chapters`);
    } catch (e: any) {
      const m = e?.response?.data?.message || "Шинэ chapter үүсгэхэд алдаа гарлаа"; setError(m); toast.error(m);
    } finally {
      setSubmitting(false); setUploadingIndex(0); setUploadTotal(0); setUploadPhase("idle");
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(7,7,14,0.85)" }}>
          <div className="w-full max-w-sm space-y-3 rounded-[14px] p-4 text-[11px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="flex items-center justify-between" style={{ color: "var(--arc-dim)" }}>
              <span className="font-medium">{uploadPhase === "creating" ? "Chapter үүсгэж байна..." : `Upload хийж байна (${uploadingIndex}/${uploadTotal})`}</span>
              <span className="font-mono" style={{ color: "var(--arc-text)" }}>{uploadPhase === "creating" ? "100%" : `${uploadProgress ?? 0}%`}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
              <div className="h-full rounded-full transition-[width] duration-200" style={{ width: uploadPhase === "creating" ? "100%" : `${uploadProgress ?? 0}%`, background: "var(--arc-cyan)" }} />
            </div>
            <p className="text-[10px]" style={{ color: "var(--arc-muted)" }}>Цонх хаахгүй, upload дуусах хүртэл хүлээнэ үү.</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-2">
          <button type="button" onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
            className="rounded-[9px] px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={btnBase}>
            ← Chapters
          </button>
          <span className="text-sm" style={{ color: "var(--arc-muted)" }}>/</span>
          <span className="text-sm font-mono" style={{ color: "var(--arc-dim)" }}>{slug}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>Шинэ Chapter</h1>
        <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Шинэ chapter үүсгэж, зургуудыг upload хийх.</p>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Chapter мэдээлэл</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Chapter number</label>
                <input type="number" min={0} style={fieldStyle} value={chapterNumber} onChange={(e) => { const n = e.currentTarget.valueAsNumber; setChapterNumber(Number.isNaN(n) ? 0 : n); }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Chapter title</label>
                <input type="text" style={fieldStyle} placeholder="Жишээ: First Encounter" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Status</label>
                <select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value as "published" | "draft")}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Зургийн файлууд</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Зургууд (олон сонгож болно)</label>
                <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)}
                  className="w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:cursor-pointer transition"
                  style={{ color: "var(--arc-dim)" }} />
                {files && files.length > 0 && (
                  <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Сонгосон {files.length} зураг – дарааллаар нь page 1..N болж орно.</p>
                )}
              </div>
              {files && files.length > 0 && (
                <div className="rounded-[9px] p-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                  <p className="text-[11px] font-medium mb-2" style={{ color: "var(--arc-dim)" }}>Сонгосон зургууд ({files.length}):</p>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from(files).slice(0, 8).map((file, idx) => (
                      <div key={idx} className="aspect-square overflow-hidden rounded-[7px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                        <img src={URL.createObjectURL(file)} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                  {files.length > 8 && <p className="text-[10px] mt-2" style={{ color: "var(--arc-muted)" }}>+{files.length - 8} илүү зураг...</p>}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="hidden lg:flex sticky bottom-6 items-center justify-end gap-3 rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}>
          <button type="button" disabled={submitting} onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
            className="rounded-[9px] px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-60" style={btnBase}>
            Цуцлах
          </button>
          <button type="submit" disabled={submitting || !files?.length}
            className="rounded-[9px] px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
            {submitting ? "Үүсгэж байна..." : "Chapter үүсгэх"}
          </button>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-[14px] p-4" style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}>
          <div className="flex gap-3 max-w-7xl mx-auto">
            <button type="button" disabled={submitting} onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
              className="flex-1 rounded-[9px] px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-60" style={btnBase}>
              Цуцлах
            </button>
            <button type="submit" disabled={submitting || !files?.length}
              className="flex-1 rounded-[9px] px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
              {submitting ? "Үүсгэж байна..." : "Үүсгэх"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
