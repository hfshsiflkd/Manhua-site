/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useState,
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
  DragEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";

interface ChapterPageInput {
  pageNumber: number;
  imageUrl: string;
  originalName?: string;
}

interface PageItem {
  id: string;
  file: File;
  previewUrl: string;
}

function uid() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const cyan = "oklch(0.72 0.17 195)";
const green = "oklch(0.75 0.17 145)";
const red = "oklch(0.75 0.2 15)";

const fieldStyle: React.CSSProperties = {
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  color: "var(--arc-text)",
  borderRadius: 9,
  padding: "10px 14px",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
};

const btnGhost: React.CSSProperties = {
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  color: "var(--arc-dim)",
};

/* ─────── Icons ─────── */
const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="9" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="18" r="1" />
  </svg>
);

export default function EditorNewChapterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingIndex, setUploadingIndex] = useState<number>(0);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "creating">("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const totalSize = useMemo(
    () => pages.reduce((sum, p) => sum + p.file.size, 0),
    [pages]
  );

  /* ─── File handling ─── */
  function addFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    const validImages = arr.filter((f) => f.type.startsWith("image/"));
    if (validImages.length !== arr.length) {
      toast.error("Зөвхөн зураг файлууд оруулна уу");
    }
    const newItems: PageItem[] = validImages.map((file) => ({
      id: uid(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPages((prev) => [...prev, ...newItems]);
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = ""; // reset so same file can be re-selected
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function removePage(id: string) {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function clearAll() {
    if (pages.length === 0) return;
    if (!confirm(`Бүх ${pages.length} зургийг устгах уу?`)) return;
    pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPages([]);
  }

  /* ─── Reorder via drag-drop on thumbnails ─── */
  function handleThumbDragStart(idx: number) {
    return () => setDraggedIdx(idx);
  }
  function handleThumbDragOver(idx: number) {
    return (e: DragEvent) => {
      e.preventDefault();
      if (draggedIdx === null || draggedIdx === idx) return;
      setPages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(draggedIdx, 1);
        next.splice(idx, 0, moved);
        return next;
      });
      setDraggedIdx(idx);
    };
  }
  function handleThumbDragEnd() {
    setDraggedIdx(null);
  }

  /* ─── Submit ─── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!slug) {
      const m = "Manhua slug олдсонгүй";
      setError(m);
      toast.error(m);
      return;
    }
    if (pages.length === 0) {
      const m = "Ядаж нэг зураг сонгоно уу";
      setError(m);
      toast.error(m);
      return;
    }
    try {
      setSubmitting(true);
      setUploadProgress(0);
      setUploadPhase("uploading");
      setUploadingIndex(0);

      const uploadedUrls: string[] = [];
      for (const [index, item] of pages.entries()) {
        setUploadingIndex(index + 1);
        const result = await uploadImage(item.file, (p) =>
          setUploadProgress(
            Math.min(100, Math.max(0, Math.round(((index + p / 100) / pages.length) * 100)))
          )
        );
        uploadedUrls.push((result as any).url);
      }
      setUploadProgress(100);
      setUploadPhase("creating");

      const payload: ChapterPageInput[] = uploadedUrls.map((url, idx) => ({
        pageNumber: idx + 1,
        imageUrl: url,
        originalName: pages[idx]?.file.name,
      }));
      await api.post(`/editor/manhuas/${slug}/chapters`, {
        chapterNumber,
        title,
        pages: payload,
        language: "mn",
        status,
      });
      toast.success("Chapter амжилттай үүслээ");
      router.push(`/editor/manhuas/${slug}/chapters`);
    } catch (err: any) {
      const m = err?.response?.data?.message || err?.message || "Шинэ chapter үүсгэхэд алдаа гарлаа";
      setError(m);
      toast.error(m);
    } finally {
      setSubmitting(false);
      setUploadingIndex(0);
      setUploadPhase("idle");
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Loading overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(7,7,14,0.85)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-md space-y-4 rounded-[14px] p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 8, background: cyan, display: "flex", alignItems: "center", justifyContent: "center", color: "#07070e" }}>
                <UploadIcon />
              </div>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>
                  {uploadPhase === "creating" ? "Chapter үүсгэж байна…" : "Зураг upload хийж байна"}
                </div>
                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  {uploadPhase === "creating"
                    ? "Сүүлийн алхам — өгөгдөл хадгалж байна"
                    : `${uploadingIndex} / ${pages.length} зураг`}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--arc-muted)" }}>
                <span>Прогресс</span>
                <span className="font-mono" style={{ color: "var(--arc-text)" }}>
                  {uploadPhase === "creating" ? "100%" : `${uploadProgress}%`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{
                    width: uploadPhase === "creating" ? "100%" : `${uploadProgress}%`,
                    background: cyan,
                  }}
                />
              </div>
            </div>
            <p className="text-[10px]" style={{ color: "var(--arc-muted)" }}>
              Цонх хаахгүй, дуусах хүртэл хүлээнэ үү.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
          <button
            type="button"
            onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
            className="rounded-[7px] px-2.5 py-1 font-medium transition-opacity hover:opacity-80"
            style={btnGhost}
          >
            ← Chapters
          </button>
          <span style={{ color: "var(--arc-muted)" }}>/</span>
          <span className="font-mono" style={{ color: "var(--arc-dim)" }}>
            {slug}
          </span>
          <span style={{ color: "var(--arc-muted)" }}>/</span>
          <span style={{ color: "var(--arc-cyan)" }}>Шинэ chapter</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--arc-text)" }}>
          Шинэ Chapter
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--arc-muted)" }}>
          Chapter мэдээллийг бөглөж, хуудсуудаа дарааллаар нь оруулна уу.
        </p>
      </div>

      {error && (
        <div
          className="rounded-[10px] px-4 py-3 text-sm flex items-start gap-2"
          style={{
            border: "1px solid oklch(0.65 0.22 15/.3)",
            background: "oklch(0.65 0.22 15/.08)",
            color: "oklch(0.85 0.12 15)",
          }}
        >
          <span className="font-bold">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Chapter info — single row of inputs */}
        <section
          className="rounded-[14px] p-4 sm:p-5"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--arc-muted)" }}>
            Chapter мэдээлэл
          </h2>
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_140px]">
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--arc-dim)" }}>
                Дугаар
              </label>
              <input
                type="number"
                min={0}
                step={1}
                style={fieldStyle}
                value={chapterNumber}
                onChange={(e) => {
                  const n = e.currentTarget.valueAsNumber;
                  setChapterNumber(Number.isNaN(n) ? 0 : n);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--arc-dim)" }}>
                Гарчиг
              </label>
              <input
                type="text"
                style={fieldStyle}
                placeholder="Заавал биш — жишээ: First Encounter"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--arc-dim)" }}>
                Төлөв
              </label>
              <div className="flex rounded-[8px] overflow-hidden" style={{ border: "1px solid var(--arc-border)" }}>
                <button
                  type="button"
                  onClick={() => setStatus("published")}
                  className="flex-1 text-[11px] font-semibold py-[9px] transition-colors"
                  style={{
                    background: status === "published" ? green : "var(--arc-elevated)",
                    color: status === "published" ? "#07070e" : "var(--arc-dim)",
                  }}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("draft")}
                  className="flex-1 text-[11px] font-semibold py-[9px] transition-colors"
                  style={{
                    background: status === "draft" ? "var(--arc-cyan)" : "var(--arc-elevated)",
                    color: status === "draft" ? "#07070e" : "var(--arc-dim)",
                  }}
                >
                  Draft
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pages section */}
        <section
          className="rounded-[14px] p-4 sm:p-5 space-y-4"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>
                Хуудсууд
              </h2>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--arc-text)" }}>
                {pages.length === 0 ? "Зураг сонгоогүй" : `${pages.length} хуудас`}
                {pages.length > 0 && (
                  <span className="ml-2 text-[10px] font-normal" style={{ color: "var(--arc-muted)" }}>
                    нийт {formatBytes(totalSize)}
                  </span>
                )}
              </p>
            </div>
            {pages.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-semibold rounded-[6px] px-2.5 py-1 transition-opacity hover:opacity-80"
                style={{
                  border: "1px solid oklch(0.65 0.22 25 / .35)",
                  background: "transparent",
                  color: "oklch(0.78 0.18 25)",
                }}
              >
                Бүгдийг арилгах
              </button>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[12px] cursor-pointer transition-colors text-center py-8 px-4"
            style={{
              border: `2px dashed ${isDragging ? cyan : "var(--arc-border)"}`,
              background: isDragging ? "oklch(0.72 0.17 195 / .08)" : "var(--arc-elevated)",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilePick}
              className="hidden"
            />
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: isDragging ? cyan : "var(--arc-card)",
                color: isDragging ? "#07070e" : "var(--arc-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                border: "1px solid var(--arc-border)",
                transition: "all .15s ease",
              }}
            >
              <UploadIcon />
            </div>
            <p className="text-[13px] font-semibold mt-3" style={{ color: "var(--arc-text)" }}>
              {isDragging ? "Энд тавь" : "Зураг сонгох эсвэл чирж тавих"}
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--arc-muted)" }}>
              PNG, JPG, WebP — олон сонгож болно. Сонгосон дарааллаар хуудас 1..N болж орно.
            </p>
          </div>

          {/* Thumbnails grid */}
          {pages.length > 0 && (
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={handleThumbDragStart(idx)}
                  onDragOver={handleThumbDragOver(idx)}
                  onDragEnd={handleThumbDragEnd}
                  className="group relative rounded-[10px] overflow-hidden transition-all"
                  style={{
                    border: `1px solid ${draggedIdx === idx ? cyan : "var(--arc-border)"}`,
                    background: "var(--arc-elevated)",
                    aspectRatio: "3/4",
                    opacity: draggedIdx !== null && draggedIdx !== idx ? 0.6 : 1,
                    cursor: "grab",
                  }}
                >
                  <img
                    src={p.previewUrl}
                    alt={`Page ${idx + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                  {/* Page number badge */}
                  <div
                    className="absolute top-1.5 left-1.5 text-[10px] font-bold rounded-md px-1.5 py-0.5"
                    style={{
                      background: "rgba(7,7,14,0.85)",
                      color: "var(--arc-text)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {idx + 1}
                  </div>
                  {/* Drag handle */}
                  <div
                    className="absolute top-1.5 right-1.5 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "rgba(7,7,14,0.85)",
                      color: "var(--arc-dim)",
                      backdropFilter: "blur(4px)",
                    }}
                    title="Чирж зөөх"
                  >
                    <DragIcon />
                  </div>
                  {/* Delete button — bottom overlay */}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(7,7,14,0.95), rgba(7,7,14,0))",
                    }}
                  >
                    <span
                      className="text-[9px] truncate flex-1"
                      style={{ color: "var(--arc-muted)" }}
                      title={p.file.name}
                    >
                      {formatBytes(p.file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePage(p.id);
                      }}
                      className="rounded-md p-1 transition-colors hover:bg-white/10"
                      style={{ color: red }}
                      title="Устгах"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sticky action bar — desktop */}
        <div
          className="hidden lg:flex sticky bottom-4 items-center justify-between gap-3 rounded-[12px] p-3"
          style={{
            border: "1px solid var(--arc-border)",
            background: "var(--arc-card)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--arc-muted)" }}>
            <span>
              <span style={{ color: "var(--arc-text)" }}>{pages.length}</span> хуудас сонгосон
            </span>
            {pages.length > 0 && (
              <>
                <span>·</span>
                <span>{formatBytes(totalSize)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
              className="rounded-[8px] px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-60"
              style={btnGhost}
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={submitting || pages.length === 0}
              className="rounded-[8px] px-5 py-2 text-[12px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: green, color: "#07070e" }}
            >
              {submitting ? "Үүсгэж байна…" : `Chapter үүсгэх${pages.length > 0 ? ` (${pages.length})` : ""}`}
            </button>
          </div>
        </div>

        {/* Mobile bottom bar */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pt-3 pb-[env(safe-area-inset-bottom,12px)]"
          style={{
            borderTop: "1px solid var(--arc-border)",
            background: "var(--arc-bg)",
          }}
        >
          <div className="flex gap-2 max-w-7xl mx-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
              className="flex-1 rounded-[9px] px-4 py-2.5 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-60"
              style={btnGhost}
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={submitting || pages.length === 0}
              className="flex-1 rounded-[9px] px-4 py-2.5 text-[12px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: green, color: "#07070e" }}
            >
              {submitting
                ? "Үүсгэж байна…"
                : pages.length > 0
                  ? `Үүсгэх (${pages.length})`
                  : "Үүсгэх"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
