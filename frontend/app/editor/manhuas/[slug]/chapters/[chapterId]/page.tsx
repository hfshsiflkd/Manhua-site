/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
  DragEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
  originalName?: string;
}
interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  pages: ChapterPage[];
  language?: string;
  status?: "published" | "draft";
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
};

const btnGhost: React.CSSProperties = {
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  color: "var(--arc-dim)",
};

/* ─── Icons ─── */
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
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

function ChapterPreview({ pages, title, chapterNumber }: { pages: ChapterPage[]; title: string; chapterNumber: number }) {
  return (
    <div className="w-full max-h-[600px] overflow-y-auto rounded-[9px]" style={{ background: "var(--arc-bg)" }}>
      <div className="mx-auto max-w-3xl">
        {title && (
          <div className="w-full px-4 py-4 sm:px-6" style={{ borderBottom: "1px solid var(--arc-border)" }}>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>
              Chapter {chapterNumber}
            </span>
            <h2 className="text-base sm:text-lg font-semibold mt-1" style={{ color: "var(--arc-text)" }}>
              {title}
            </h2>
          </div>
        )}
        <div className="space-y-0">
          {pages.map((p, idx) => (
            <img
              key={`prev-${idx}`}
              src={p.imageUrl}
              alt={`Page ${p.pageNumber}`}
              className="w-full h-auto block"
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EditorEditChapterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const chapterId = params?.chapterId as string;
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPages, setSavingPages] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [addingImages, setAddingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingIndex, setUploadingIndex] = useState<number>(0);
  const [uploadTotal, setUploadTotal] = useState<number>(0);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");

  // Drag reorder + selection
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const totalSelected = selected.size;
  const allSelected = pages.length > 0 && totalSelected === pages.length;

  /* ─── Load chapter ─── */
  useEffect(() => {
    if (!chapterId) return;
    async function load() {
      try {
        setLoading(true);
        const res = await api.get<Chapter>(`/editor/chapters/${chapterId}`);
        const ch = res.data;
        setChapter(ch);
        setPages((ch.pages || []).slice().sort((a, b) => a.pageNumber - b.pageNumber));
        setChapterNumber(ch.chapterNumber);
        setTitle(ch.title || "");
        setStatus((ch.status as "published" | "draft") || "published");
      } catch {
        setError("Chapter уншихад алдаа гарлаа");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [chapterId]);

  /* ─── Save meta ─── */
  const handleSaveMeta = async (e: FormEvent) => {
    e.preventDefault();
    if (!chapter) return;
    try {
      setSavingMeta(true);
      setError(null);
      await api.put(`/editor/chapters/${chapterId}`, {
        chapterNumber,
        title,
        status,
        pages,
      });
      setChapter({ ...chapter, chapterNumber, title, status, pages });
      toast.success("Мэдээлэл хадгалагдлаа");
    } catch (err: any) {
      const m = err?.response?.data?.message || "Хадгалах үед алдаа гарлаа";
      setError(m);
      toast.error(m);
    } finally {
      setSavingMeta(false);
    }
  };

  const saveChapterPages = async (updatedPages: ChapterPage[]) => {
    if (!chapter) return;
    setSavingPages(true);
    try {
      setError(null);
      await api.put(`/editor/chapters/${chapterId}`, {
        chapterNumber,
        title,
        status,
        pages: updatedPages,
      });
      setChapter({ ...chapter, pages: updatedPages });
      setPages(updatedPages);
    } catch (e: any) {
      setError(e.response?.data?.message || "Хадгалах явцад алдаа гарлаа");
    } finally {
      setSavingPages(false);
    }
  };

  /* ─── Add images via input + drop ─── */
  async function processNewFiles(fileArr: File[]) {
    if (!chapter || !fileArr.length) return;
    try {
      setError(null);
      setAddingImages(true);
      setUploadProgress(0);
      setUploadingIndex(0);
      setUploadTotal(fileArr.length);
      setUploadPhase("uploading");

      const uploaded: string[] = [];
      for (const [index, file] of fileArr.entries()) {
        setUploadingIndex(index + 1);
        const r = await uploadImage(file, (p) =>
          setUploadProgress(
            Math.min(100, Math.max(0, Math.round(((index + p / 100) / fileArr.length) * 100)))
          )
        );
        uploaded.push((r as any).url);
      }
      setUploadProgress(100);
      setUploadPhase("saving");

      const newPages: ChapterPage[] = uploaded.map((url, idx) => ({
        pageNumber: pages.length + idx + 1,
        imageUrl: url,
        originalName: fileArr[idx]?.name,
      }));
      const merged = [...pages, ...newPages].map((p, idx) => ({
        pageNumber: idx + 1,
        imageUrl: p.imageUrl,
        originalName: p.originalName,
      }));
      await saveChapterPages(merged);
      toast.success(`${newPages.length} хуудас нэмэгдлээ`);
    } catch (e: any) {
      const m = e?.response?.data?.message || e?.message || "Page нэмэхэд алдаа гарлаа";
      setError(m);
      toast.error(m);
    } finally {
      setAddingImages(false);
      setUploadingIndex(0);
      setUploadTotal(0);
      setUploadPhase("idle");
    }
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const arr = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    processNewFiles(arr);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files?.length) return;
    const arr = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    processNewFiles(arr);
  }
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  /* ─── Selection ─── */
  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }
  function selectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pages.map((_, i) => i)));
    }
  }
  function clearSelection() {
    setSelected(new Set());
  }

  /* ─── Bulk delete ─── */
  async function deleteSelected() {
    if (totalSelected === 0) return;
    const ok = await confirm({
      title: `${totalSelected} хуудас устгах уу?`,
      description: "Энэ үйлдлийг буцаах боломжгүй.",
      confirmText: "Устгах",
      cancelText: "Болих",
    });
    if (!ok) return;
    const remaining = pages
      .filter((_, i) => !selected.has(i))
      .map((p, idx) => ({
        pageNumber: idx + 1,
        imageUrl: p.imageUrl,
        originalName: p.originalName,
      }));
    setSelected(new Set());
    await saveChapterPages(remaining);
    toast.success(`${totalSelected} хуудас устгагдлаа`);
  }

  /* ─── Reorder ─── */
  function handleThumbDragStart(idx: number) {
    return () => setDragIndex(idx);
  }
  function handleThumbDragOver(idx: number) {
    return (e: DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === idx) return;
      // Live reorder visual
      setPages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(idx, 0, moved);
        return next;
      });
      setDragIndex(idx);
    };
  }
  async function handleThumbDragEnd() {
    setDragIndex(null);
    // Save the new order
    const reIndexed = pages.map((p, idx) => ({
      pageNumber: idx + 1,
      imageUrl: p.imageUrl,
      originalName: p.originalName,
    }));
    await saveChapterPages(reIndexed);
  }

  /* ─── Loading / Error states ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--arc-muted)" }}>
        Уншиж байна...
      </div>
    );
  }
  if (!chapter) {
    return (
      <div
        className="rounded-[9px] px-4 py-3 text-sm"
        style={{
          border: "1px solid oklch(0.65 0.22 15/.3)",
          background: "oklch(0.65 0.22 15/.08)",
          color: "oklch(0.85 0.12 15)",
        }}
      >
        Chapter олдсонгүй
      </div>
    );
  }

  const totalSize = pages.reduce((s) => s, 0); // pages don't have size on server
  void totalSize;

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Loading overlay */}
      {addingImages && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(7,7,14,0.85)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-[14px] p-5"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
          >
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: cyan,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#07070e",
                }}
              >
                <UploadIcon />
              </div>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>
                  {uploadPhase === "saving" ? "Хадгалж байна…" : "Зураг upload хийж байна"}
                </div>
                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  {uploadPhase === "saving"
                    ? "Сүүлийн алхам"
                    : `${uploadingIndex} / ${uploadTotal} зураг`}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--arc-muted)" }}>
                <span>Прогресс</span>
                <span className="font-mono" style={{ color: "var(--arc-text)" }}>
                  {uploadPhase === "saving" ? "100%" : `${uploadProgress}%`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{
                    width: uploadPhase === "saving" ? "100%" : `${uploadProgress}%`,
                    background: cyan,
                  }}
                />
              </div>
            </div>
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
          <span style={{ color: "var(--arc-cyan)" }}>Ch. {chapter.chapterNumber} засах</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--arc-text)" }}>
          Chapter {chapter.chapterNumber} засах
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--arc-muted)" }}>
          Мэдээлэл болон хуудсуудаа удирд. Зураг чирэх → дараалал; нэг олон сонгох → хамтад нь устгах.
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

      {/* Meta info */}
      <section
        className="rounded-[14px] p-4 sm:p-5"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>
            Мэдээлэл
          </h2>
          {chapter && (
            <span
              className="text-[10px] font-semibold uppercase rounded-md px-2 py-0.5"
              style={{
                background:
                  chapter.status === "published"
                    ? "oklch(0.75 0.17 145 / .15)"
                    : "oklch(0.72 0.17 195 / .15)",
                color: chapter.status === "published" ? green : cyan,
                border: `1px solid ${chapter.status === "published" ? green : cyan}40`,
              }}
            >
              {chapter.status === "published" ? "Live" : "Draft"}
            </span>
          )}
        </div>
        <form onSubmit={handleSaveMeta}>
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_140px_140px]">
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
                placeholder="Заавал биш"
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
                    background: status === "draft" ? cyan : "var(--arc-elevated)",
                    color: status === "draft" ? "#07070e" : "var(--arc-dim)",
                  }}
                >
                  Draft
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium opacity-0">Save</label>
              <button
                type="submit"
                disabled={savingMeta}
                className="w-full rounded-[8px] px-3 py-[9px] text-[12px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: green, color: "#07070e" }}
              >
                {savingMeta ? "Хадгалж…" : "Хадгалах"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Pages section */}
      <section
        className="rounded-[14px] p-4 sm:p-5 space-y-4"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        {/* Header row with selection controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>
              Хуудсууд
            </h2>
            <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--arc-text)" }}>
              {pages.length} хуудас
              {totalSelected > 0 && (
                <span className="ml-2 text-[10px] font-semibold" style={{ color: cyan }}>
                  · {totalSelected} сонгосон
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pages.length > 0 && (
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] font-semibold rounded-[6px] px-2.5 py-1.5 transition-opacity hover:opacity-80"
                style={btnGhost}
              >
                {allSelected ? "Сонголтыг арилгах" : "Бүгдийг сонгох"}
              </button>
            )}
            {totalSelected > 0 && (
              <>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[10px] font-semibold rounded-[6px] px-2.5 py-1.5 transition-opacity hover:opacity-80"
                  style={btnGhost}
                >
                  Болих
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={savingPages}
                  className="text-[10px] font-bold rounded-[6px] px-3 py-1.5 transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-1"
                  style={{
                    background: red,
                    color: "#07070e",
                  }}
                >
                  <TrashIcon />
                  Устгах ({totalSelected})
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowPreview((s) => !s)}
              disabled={pages.length === 0}
              className="text-[10px] font-semibold rounded-[6px] px-2.5 py-1.5 transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center gap-1"
              style={btnGhost}
            >
              <EyeIcon />
              {showPreview ? "Preview хаах" : "Preview харах"}
            </button>
          </div>
        </div>

        {/* Drop zone — add new pages */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !addingImages && fileInputRef.current?.click()}
          className="rounded-[12px] cursor-pointer transition-colors text-center py-6 px-4"
          style={{
            border: `2px dashed ${isDragging ? cyan : "var(--arc-border)"}`,
            background: isDragging ? "oklch(0.72 0.17 195 / .08)" : "var(--arc-elevated)",
            opacity: addingImages ? 0.5 : 1,
            pointerEvents: addingImages ? "none" : "auto",
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
          <div className="flex items-center justify-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: isDragging ? cyan : "var(--arc-card)",
                color: isDragging ? "#07070e" : "var(--arc-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--arc-border)",
                flexShrink: 0,
              }}
            >
              <UploadIcon />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>
                {isDragging ? "Энд тавь" : "Шинэ хуудас нэмэх"}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--arc-muted)" }}>
                Click эсвэл drag&drop — олон файл сонгож болно
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        {showPreview && pages.length > 0 && (
          <div
            className="rounded-[10px] p-3"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
          >
            <ChapterPreview pages={pages} title={title} chapterNumber={chapterNumber} />
          </div>
        )}

        {/* Vertical list */}
        {pages.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--arc-muted)" }}>
            Одоогоор хуудас алга. Дээрээс зураг нэмж эхэлнэ үү.
          </p>
        ) : (
          <div className="space-y-1.5">
            {pages.map((p, idx) => {
              const isSelected = selected.has(idx);
              const isDragged = dragIndex === idx;
              return (
                <div
                  key={`${p.imageUrl}-${idx}`}
                  draggable={!addingImages}
                  onDragStart={handleThumbDragStart(idx)}
                  onDragOver={handleThumbDragOver(idx)}
                  onDragEnd={handleThumbDragEnd}
                  onClick={() => toggleSelect(idx)}
                  className="group relative flex items-center gap-3 rounded-[10px] p-2 pr-3 transition-all"
                  style={{
                    border: `1px solid ${
                      isSelected ? cyan : isDragged ? "var(--arc-cyan)" : "var(--arc-border)"
                    }`,
                    background: isSelected
                      ? "oklch(0.72 0.17 195 / .08)"
                      : "var(--arc-elevated)",
                    opacity: dragIndex !== null && dragIndex !== idx ? 0.5 : 1,
                    cursor: addingImages ? "wait" : "pointer",
                    boxShadow: isSelected ? `0 0 0 3px ${cyan}25` : "none",
                  }}
                >
                  {/* Drag handle */}
                  <div
                    className="flex-shrink-0 select-none"
                    style={{
                      color: "var(--arc-muted)",
                      cursor: "grab",
                      fontSize: 14,
                      lineHeight: 1,
                      letterSpacing: -2,
                    }}
                    title="Чирж дараалал солих"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋮⋮
                  </div>

                  {/* Checkbox */}
                  <div
                    className="flex-shrink-0 transition-colors"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      background: isSelected ? cyan : "var(--arc-card)",
                      border: `1.5px solid ${isSelected ? cyan : "var(--arc-border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "#07070e" : "transparent",
                    }}
                  >
                    {isSelected && <CheckIcon />}
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="flex-shrink-0 overflow-hidden rounded-[7px]"
                    style={{
                      width: 48,
                      height: 64,
                      border: "1px solid var(--arc-border)",
                      background: "var(--arc-card)",
                    }}
                  >
                    <img
                      src={p.imageUrl}
                      alt={`Page ${idx + 1}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>

                  {/* Page info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-bold rounded-md px-1.5 py-0.5"
                        style={{
                          background: "var(--arc-card)",
                          color: "var(--arc-text)",
                          border: "1px solid var(--arc-border)",
                        }}
                      >
                        Page {idx + 1}
                      </span>
                    </div>
                    <p
                      className="text-[11px] mt-1 truncate"
                      style={{ color: "var(--arc-dim)" }}
                      title={p.originalName || ""}
                    >
                      {p.originalName || (
                        <span style={{ color: "var(--arc-muted)", fontStyle: "italic" }}>
                          (нэргүй)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Per-row delete (hover) */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({
                        title: "Хуудас устгах уу?",
                        description: `Page ${idx + 1}-ийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
                        confirmText: "Устгах",
                        cancelText: "Болих",
                      });
                      if (!ok) return;
                      const remaining = pages
                        .filter((_, i) => i !== idx)
                        .map((px, i) => ({
                          pageNumber: i + 1,
                          imageUrl: px.imageUrl,
                          originalName: px.originalName,
                        }));
                      await saveChapterPages(remaining);
                    }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[6px] p-1.5"
                    style={{
                      border: "1px solid oklch(0.65 0.22 25 / .35)",
                      background: "transparent",
                      color: red,
                    }}
                    title="Энэ хуудсыг устгах"
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Hint */}
        {pages.length > 0 && totalSelected === 0 && (
          <p className="text-[10px] text-center" style={{ color: "var(--arc-muted)" }}>
            💡 Click — сонгох · Чирэх — дарааллыг солих · Hover — нэг бүрчлэн устгах
          </p>
        )}
      </section>

      {/* Sticky bulk action bar — only when items selected */}
      {totalSelected > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-3 py-3"
          style={{
            borderTop: `1px solid ${cyan}40`,
            background: "rgba(7,7,14,0.95)",
            backdropFilter: "blur(8px)",
            boxShadow: `0 -8px 32px ${cyan}20`,
          }}
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto gap-3">
            <div className="text-[12px]" style={{ color: "var(--arc-text)" }}>
              <span className="font-bold" style={{ color: cyan }}>
                {totalSelected}
              </span>{" "}
              хуудас сонгосон
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                style={btnGhost}
              >
                Болих
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={savingPages}
                className="rounded-[8px] px-4 py-1.5 text-[11px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
                style={{ background: red, color: "#07070e" }}
              >
                <TrashIcon />
                Устгах ({totalSelected})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
