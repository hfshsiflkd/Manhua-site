/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "8px 12px", fontSize: 12,
  color: "var(--arc-text)", outline: "none",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
};

interface ChapterPageInput { pageNumber: number; imageUrl: string; originalName?: string; }

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
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "creating">("idle");
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug) { toast.error("Manhua slug олдсонгүй"); return; }
    if (!files || files.length === 0) { toast.error("Ядаж нэг зураг сонгоно уу"); return; }

    try {
      setSubmitting(true);
      setUploadProgress(0);
      setUploadPhase("uploading");

      const fileArr = Array.from(files);
      setUploadTotal(fileArr.length);
      const uploadedUrls: string[] = [];

      for (const [index, file] of fileArr.entries()) {
        setUploadingIndex(index + 1);
        const result = await uploadImage(file, (percent) => {
          setUploadProgress(Math.min(100, Math.max(0, Math.round(((index + percent / 100) / fileArr.length) * 100))));
        });
        uploadedUrls.push((result as any).url);
      }

      setUploadProgress(100);
      setUploadPhase("creating");

      if (!uploadedUrls.length) { toast.error("Зураг upload болоогүй байна"); return; }

      const pages: ChapterPageInput[] = uploadedUrls.map((url, idx) => ({
        pageNumber: idx + 1, imageUrl: url, originalName: fileArr[idx]?.name,
      }));

      await api.post(`/admin/manhuas/${slug}/chapters`, { chapterNumber, title, pages, language: "mn", status });
      toast.success("Chapter амжилттай үүслээ");
      router.push(`/admin/manhuas/${slug}/chapters`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Шинэ chapter үүсгэхэд алдаа гарлаа");
    } finally {
      setSubmitting(false);
      setUploadingIndex(0);
      setUploadTotal(0);
      setUploadPhase("idle");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-4">
      {/* Upload overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,7,14,.85)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-[16px] p-5 space-y-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: "var(--arc-text)", fontWeight: 600 }}>
                {uploadPhase === "creating" ? "Chapter үүсгэж байна..." : `Upload (${uploadingIndex}/${uploadTotal})`}
              </span>
              <span style={{ color: "var(--arc-cyan)", fontVariantNumeric: "tabular-nums" }}>
                {uploadPhase === "creating" ? "100%" : `${uploadProgress ?? 0}%`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{ width: uploadPhase === "creating" ? "100%" : `${uploadProgress ?? 0}%`, background: "var(--arc-cyan)" }}
              />
            </div>
            <p className="text-[10px]" style={{ color: "var(--arc-muted)" }}>Цонх хаахгүй, upload дуусах хүртэл хүлээнэ үү.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-[14px] px-4 py-3"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div>
          <div className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Шинэ chapter нэмэх
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--arc-muted)" }}>
            Manhua: <span style={{ color: "var(--arc-dim)" }}>{slug || "(slug байхгүй)"}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
          className="self-start rounded-[9px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 sm:self-auto"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
        >
          ← Chapter жагсаалт руу
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[14px] p-5 space-y-4"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Chapter number</label>
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={chapterNumber}
              onChange={(e) => { const n = e.currentTarget.valueAsNumber; setChapterNumber(Number.isNaN(n) ? 0 : n); }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
            />
          </div>
          <div>
            <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Status</label>
            <select
              style={inputStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as "published" | "draft")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Chapter гарчиг</label>
          <input
            style={inputStyle}
            placeholder="Жишээ: First Encounter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
          />
        </div>

        <div>
          <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>
            Зургийн файлууд <span style={{ color: "var(--arc-rose)" }}>*</span>
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFiles(e.target.files)}
            className="w-full text-[11px] file:mr-3 file:rounded-[7px] file:border-0 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:cursor-pointer"
            style={{
              color: "var(--arc-dim)",
            }}
          />
          {files && files.length > 0 && (
            <p className="mt-1 text-[10px]" style={{ color: "var(--arc-muted)" }}>
              {files.length} зураг сонгогдлоо — page 1..{files.length} болж орно.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--arc-border)" }}>
          <button
            type="button"
            disabled={submitting}
            onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
            className="rounded-[9px] px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            Цуцлах
          </button>
          <button
            type="submit"
            disabled={submitting || !files?.length}
            className="rounded-[9px] px-5 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
          >
            {submitting ? "Үүсгэж байна..." : "Chapter үүсгэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
