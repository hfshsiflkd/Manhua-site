/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

interface ChapterPage { pageNumber: number; imageUrl: string; originalName?: string; }
interface Chapter { _id: string; chapterNumber: number; title?: string; pages: ChapterPage[]; language?: string; status?: "published" | "draft"; }

function ChapterPreview({ pages, title, chapterNumber }: { pages: ChapterPage[]; title: string; chapterNumber: number }) {
  return (
    <div className="w-full max-h-[600px] overflow-y-auto rounded-[9px]" style={{ background: "var(--arc-bg)" }}>
      <div className="mx-auto max-w-3xl">
        {title && (
          <div className="w-full px-4 py-4 sm:px-6" style={{ borderBottom: "1px solid var(--arc-border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>Chapter {chapterNumber}</span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold leading-relaxed" style={{ color: "var(--arc-text)" }}>
              <span style={{ color: "var(--arc-muted)" }}>(</span>{title}<span style={{ color: "var(--arc-muted)" }}>)</span>
            </h2>
          </div>
        )}
        <div className="space-y-0">
          {pages.map((p, idx) => (
            <div key={`preview-${p.pageNumber}-${idx}`} className="w-full">
              <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} className="w-full h-auto block" loading="lazy" />
            </div>
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

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPages, setSavingPages] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [addingImages, setAddingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number>(0);
  const [uploadTotal, setUploadTotal] = useState<number>(0);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const fieldStyle: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)", borderRadius: 9, padding: "10px 16px", fontSize: 13, outline: "none", width: "100%" };
  const btnBase: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" };

  useEffect(() => {
    if (!chapterId) return;
    async function load() {
      try {
        setLoading(true);
        const res = await api.get<Chapter>(`/editor/chapters/${chapterId}`);
        const ch = res.data;
        setChapter(ch);
        setPages((ch.pages || []).slice().sort((a, b) => a.pageNumber - b.pageNumber));
        setChapterNumber(ch.chapterNumber); setTitle(ch.title || ""); setStatus((ch.status as "published" | "draft") || "published");
      } catch (e: any) { setError("Chapter уншихад алдаа гарлаа"); }
      finally { setLoading(false); }
    }
    load();
  }, [chapterId]);

  const handleSaveMeta = async (e: FormEvent) => {
    e.preventDefault();
    if (!chapter) return;
    try {
      setSavingMeta(true); setError(null);
      await api.put(`/editor/chapters/${chapterId}`, { chapterNumber, title, status, pages });
      setChapter({ ...chapter, chapterNumber, title, status, pages });
      toast.success("Meta мэдээлэл хадгалагдлаа");
    } catch (err: any) {
      const m = err?.response?.data?.message || "Chapter-ийн мэдээллийг хадгалах үед алдаа гарлаа"; setError(m); toast.error(m);
    } finally { setSavingMeta(false); }
  };

  const saveChapterPages = async (updatedPages: ChapterPage[]) => {
    if (!chapter) return;
    setSavingPages(true);
    try {
      setError(null);
      await api.put(`/editor/chapters/${chapterId}`, { chapterNumber, title, status, pages: updatedPages });
      setChapter({ ...chapter, pages: updatedPages }); setPages(updatedPages);
    } catch (e: any) { setError(e.response?.data?.message || "Хадгалах явцад алдаа гарлаа"); }
    finally { setSavingPages(false); }
  };

  const handleAddImages = async () => {
    if (!files || !chapter) { const m = "Файл сонгоно уу"; setError(m); toast.error(m); return; }
    try {
      setError(null); setAddingImages(true);
      const fileArr = Array.from(files);
      if (!fileArr.length) return;
      setUploadProgress(0); setUploadingIndex(0); setUploadTotal(fileArr.length); setUploadPhase("uploading");
      const uploaded: string[] = [];
      for (const [index, file] of fileArr.entries()) {
        setUploadingIndex(index + 1);
        const r = await uploadImage(file, (p) => setUploadProgress(Math.min(100, Math.max(0, Math.round(((index + p / 100) / fileArr.length) * 100)))));
        uploaded.push((r as any).url || (r as any).secure_url || r.url);
      }
      setUploadProgress(100); setUploadPhase("saving");
      const newPages: ChapterPage[] = uploaded.map((url, idx) => ({ pageNumber: pages.length + idx + 1, imageUrl: url, originalName: fileArr[idx]?.name }));
      const merged = [...pages, ...newPages].map((p, idx) => ({ pageNumber: idx + 1, imageUrl: p.imageUrl, originalName: p.originalName }));
      await saveChapterPages(merged);
      setFiles(null); toast.success("Шинэ page-үүд нэмэгдлээ");
    } catch (e: any) { const m = e.response?.data?.message || "Page нэмэхэд алдаа гарлаа"; setError(m); toast.error(m); }
    finally { setAddingImages(false); setUploadProgress(null); setUploadingIndex(0); setUploadTotal(0); setUploadPhase("idle"); }
  };

  const handleRemovePage = async (index: number) => {
    if (!chapter) return;
    const ok = await confirm({ title: "Page устгах уу?", description: "Энэ page-ийг устгавал буцаах боломжгүй.", confirmText: "Устгах", cancelText: "Болих" });
    if (!ok) return;
    const remaining = pages.filter((_, i) => i !== index).map((p, idx) => ({ pageNumber: idx + 1, imageUrl: p.imageUrl, originalName: p.originalName }));
    await saveChapterPages(remaining);
  };

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const updated = [...pages];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);
    const reIndexed = updated.map((p, idx) => ({ pageNumber: idx + 1, imageUrl: p.imageUrl, originalName: p.originalName }));
    setDragIndex(null);
    await saveChapterPages(reIndexed);
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--arc-muted)" }}>Уншиж байна...</div>;
  if (!chapter) return (
    <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>Chapter олдсонгүй</div>
  );

  return (
    <div className="space-y-6">
      {addingImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(7,7,14,0.85)" }}>
          <div className="w-full max-w-sm space-y-3 rounded-[14px] p-4 text-[11px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="flex items-center justify-between" style={{ color: "var(--arc-dim)" }}>
              <span className="font-medium">{uploadPhase === "saving" ? "Page-үүд хадгалж байна..." : `Upload хийж байна (${uploadingIndex}/${uploadTotal})`}</span>
              <span className="font-mono" style={{ color: "var(--arc-text)" }}>{uploadPhase === "saving" ? "100%" : `${uploadProgress ?? 0}%`}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
              <div className="h-full rounded-full transition-[width] duration-200" style={{ width: uploadPhase === "saving" ? "100%" : `${uploadProgress ?? 0}%`, background: "var(--arc-cyan)" }} />
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
        <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>Edit Chapter {chapter.chapterNumber}</h1>
        <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Chapter мэдээлэл болон page-үүдийг удирдана.</p>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
        <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Chapter мэдээлэл</h2>
          <form onSubmit={handleSaveMeta} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Chapter number</label>
              <input type="number" min={0} style={fieldStyle} value={chapterNumber} onChange={(e) => { const n = e.currentTarget.valueAsNumber; setChapterNumber(Number.isNaN(n) ? 0 : n); }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Title</label>
              <input type="text" style={fieldStyle} placeholder="Жишээ: First Encounter" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Status</label>
              <select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value as "published" | "draft")}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <button type="submit" disabled={savingMeta}
              className="w-full rounded-[9px] px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
              {savingMeta ? "Хадгалж байна..." : "Meta хадгалах"}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          {pages.length > 0 && (
            <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Preview</h2>
                <button type="button" onClick={() => setShowPreview(!showPreview)}
                  className="rounded-[9px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80" style={btnBase}>
                  {showPreview ? "Харуулахгүй" : "Харуулах"}
                </button>
              </div>
              {showPreview && (
                <div className="mt-4 rounded-[9px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                  <ChapterPreview pages={pages} title={title} chapterNumber={chapterNumber} />
                </div>
              )}
            </section>
          )}

          <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Шинэ page-үүд нэмэх</h2>
            <div className="space-y-4">
              <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)}
                className="w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:cursor-pointer transition"
                style={{ color: "var(--arc-dim)" }} />
              {files && files.length > 0 && (
                <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Сонгосон {files.length} файл – одоогийн {pages.length} page-ийн араас залгана.</p>
              )}
              <button disabled={savingPages || addingImages || !files?.length} onClick={handleAddImages}
                className="rounded-[9px] px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "var(--arc-cyan)", color: "#07070e" }}>
                {savingPages ? "Хадгалж байна..." : "Шинэ page-үүд хадгалах"}
              </button>
            </div>
          </section>

          <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Pages жагсаалт ({pages.length})</h2>
            {pages.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--arc-muted)" }}>Одоогоор page алга. Дээрээс зураг нэмж эхэлнэ үү.</p>
            ) : (
              <ul className="space-y-2">
                {pages.map((p, idx) => (
                  <li key={`${p.imageUrl}-${idx}`} draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(idx)}
                    className={`flex items-center gap-3 rounded-[9px] px-3 py-2.5 transition ${dragIndex === idx ? "opacity-50" : ""}`}
                    style={{ border: "1px solid var(--arc-border)", background: dragIndex === idx ? "var(--arc-elevated)" : "var(--arc-card)" }}>
                    <div className="flex h-full cursor-grab select-none items-center pr-1" style={{ color: "var(--arc-muted)" }}>
                      <span className="leading-none">⋮⋮</span>
                    </div>
                    <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-[7px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                      <img src={p.imageUrl} alt={`Page ${idx + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium" style={{ color: "var(--arc-text)" }}>Page {idx + 1}</span>
                      {p.originalName && <span className="block text-[10px] truncate" style={{ color: "var(--arc-muted)" }} title={p.originalName}>{p.originalName}</span>}
                    </div>
                    <button type="button" onClick={() => handleRemovePage(idx)}
                      className="rounded-[7px] px-2 sm:px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 flex-shrink-0"
                      style={{ color: "oklch(0.75 0.22 15)" }}>
                      <span className="hidden sm:inline">Устгах</span>
                      <span className="sm:hidden">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
