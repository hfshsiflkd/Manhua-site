/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "8px 12px", fontSize: 12,
  color: "var(--arc-text)", outline: "none",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
};

const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)";
};
const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "var(--arc-border)";
};

interface ChapterPage { pageNumber: number; imageUrl: string; originalName?: string; }
interface Chapter {
  _id: string; chapterNumber: number; title?: string;
  pages: ChapterPage[]; language?: string; status?: "published" | "draft";
}

export default function AdminEditChapterPage() {
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
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    if (!chapterId) return;
    async function load() {
      try {
        const res = await api.get<Chapter>(`/admin/chapters/${chapterId}`);
        const ch = res.data;
        setChapter(ch);
        setPages((ch.pages || []).slice().sort((a, b) => a.pageNumber - b.pageNumber));
        setChapterNumber(ch.chapterNumber);
        setTitle(ch.title || "");
        setStatus((ch.status as "published" | "draft") || "published");
      } catch { toast.error("Chapter уншихад алдаа гарлаа"); }
      finally { setLoading(false); }
    }
    load();
  }, [chapterId, toast]);

  const handleSaveMeta = async (e: FormEvent) => {
    e.preventDefault();
    if (!chapter) return;
    try {
      setSavingMeta(true);
      await api.put(`/admin/chapters/${chapterId}`, { chapterNumber, title, status, pages });
      setChapter({ ...chapter, chapterNumber, title, status, pages });
      toast.success("Meta мэдээлэл хадгалагдлаа");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Хадгалах үед алдаа гарлаа");
    } finally { setSavingMeta(false); }
  };

  const saveChapterPages = async (updatedPages: ChapterPage[]) => {
    if (!chapter) return;
    setSavingPages(true);
    try {
      await api.put(`/admin/chapters/${chapterId}`, { chapterNumber, title, status, pages: updatedPages });
      setChapter({ ...chapter, pages: updatedPages });
      setPages(updatedPages);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Хадгалах явцад алдаа гарлаа");
    } finally { setSavingPages(false); }
  };

  const handleAddImages = async () => {
    if (!files || !chapter) { toast.error("Файл сонгоно уу"); return; }
    try {
      setAddingImages(true);
      const fileArr = Array.from(files);
      setUploadProgress(0);
      setUploadTotal(fileArr.length);
      setUploadPhase("uploading");
      const uploaded: string[] = [];
      for (const [index, file] of fileArr.entries()) {
        setUploadingIndex(index + 1);
        const r = await uploadImage(file, (percent) => {
          setUploadProgress(Math.min(100, Math.max(0, Math.round(((index + percent / 100) / fileArr.length) * 100))));
        });
        uploaded.push((r as any).url || (r as any).secure_url || r.url);
      }
      setUploadProgress(100);
      setUploadPhase("saving");

      const newPages: ChapterPage[] = uploaded.map((url, idx) => ({
        pageNumber: pages.length + idx + 1, imageUrl: url, originalName: fileArr[idx]?.name,
      }));
      const merged = [...pages, ...newPages].map((p, idx) => ({ pageNumber: idx + 1, imageUrl: p.imageUrl, originalName: p.originalName }));
      await saveChapterPages(merged);
      setFiles(null);
      toast.success("Шинэ page-үүд нэмэгдлээ");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Page нэмэхэд алдаа гарлаа");
    } finally {
      setAddingImages(false);
      setUploadProgress(null);
      setUploadingIndex(0);
      setUploadTotal(0);
      setUploadPhase("idle");
    }
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
    setDragIndex(null);
    await saveChapterPages(updated.map((p, idx) => ({ pageNumber: idx + 1, imageUrl: p.imageUrl, originalName: p.originalName })));
  };

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
          <circle cx="22" cy="22" r="18" stroke="var(--arc-border)" strokeWidth="3" />
          <circle cx="22" cy="22" r="18" stroke="var(--arc-cyan)" strokeWidth="3" strokeLinecap="round" strokeDasharray="28 84" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!chapter) return (
    <div className="p-4 text-[13px] rounded-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
      Chapter олдсонгүй
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-4">
      {/* Upload overlay */}
      {addingImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,7,14,.85)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-[16px] p-5 space-y-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: "var(--arc-text)", fontWeight: 600 }}>
                {uploadPhase === "saving" ? "Page-үүд хадгалж байна..." : `Upload (${uploadingIndex}/${uploadTotal})`}
              </span>
              <span style={{ color: "var(--arc-cyan)" }}>{uploadPhase === "saving" ? "100%" : `${uploadProgress ?? 0}%`}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
              <div className="h-full rounded-full transition-[width] duration-200" style={{ width: uploadPhase === "saving" ? "100%" : `${uploadProgress ?? 0}%`, background: "var(--arc-cyan)" }} />
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
            Ch. {chapter.chapterNumber} засах
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--arc-muted)" }}>
            Manhua: <span style={{ color: "var(--arc-dim)" }}>{slug}</span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
          className="self-start rounded-[9px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 sm:self-auto"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
        >
          ← Chapter жагсаалт руу
        </button>
      </div>

      {/* Meta form */}
      <form
        onSubmit={handleSaveMeta}
        className="rounded-[14px] p-5 space-y-3"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="text-[12px] font-semibold mb-1" style={{ color: "var(--arc-text)" }}>Chapter мэдээлэл</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Chapter number</label>
            <input type="number" min={0} style={inputStyle} value={chapterNumber}
              onChange={(e) => { const n = e.currentTarget.valueAsNumber; setChapterNumber(Number.isNaN(n) ? 0 : n); }}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          <div className="sm:col-span-2">
            <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Гарчиг</label>
            <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="First Encounter" onFocus={focusBorder} onBlur={blurBorder} />
          </div>
        </div>
        <div>
          <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Status</label>
          <select style={{ ...inputStyle, width: "auto", minWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value as "published" | "draft")} onFocus={focusBorder} onBlur={blurBorder}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="flex justify-end pt-1" style={{ borderTop: "1px solid var(--arc-border)" }}>
          <button type="submit" disabled={savingMeta}
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}>
            {savingMeta ? "Хадгалж байна..." : "Meta хадгалах"}
          </button>
        </div>
      </form>

      {/* Add images */}
      <section
        className="rounded-[14px] p-5 space-y-3"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="text-[12px] font-semibold" style={{ color: "var(--arc-text)" }}>Шинэ page-үүд нэмэх</div>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFiles(e.target.files)}
          className="w-full text-[11px] file:mr-3 file:rounded-[7px] file:border-0 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:cursor-pointer"
          style={{ color: "var(--arc-dim)" }}
        />
        {files && files.length > 0 && (
          <p className="text-[10px]" style={{ color: "var(--arc-muted)" }}>
            {files.length} файл сонгогдлоо — одоогийн {pages.length} page-ийн ард залгагдана.
          </p>
        )}
        <button
          disabled={savingPages || addingImages || !files?.length}
          onClick={handleAddImages}
          className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
        >
          {savingPages ? "Хадгалж байна..." : "Page-үүд нэмэх"}
        </button>
      </section>

      {/* Pages list */}
      <section
        className="rounded-[14px] p-5 space-y-3"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-semibold" style={{ color: "var(--arc-text)" }}>
            Pages жагсаалт
          </div>
          <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{pages.length} хуудас · drag & drop</span>
        </div>

        {pages.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
            Одоогоор page алга. Дээрээс зураг нэмж эхэлнэ үү.
          </p>
        ) : (
          <ul className="space-y-2">
            {pages.map((p, idx) => (
              <li
                key={`${p.imageUrl}-${idx}`}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors"
                style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", cursor: "grab" }}
              >
                <div className="select-none text-[16px] leading-none" style={{ color: "var(--arc-muted)" }}>⋮⋮</div>
                <div className="overflow-hidden rounded-[6px] shrink-0" style={{ width: 36, height: 48, background: "var(--arc-card)" }}>
                  <img src={p.imageUrl} alt={`Page ${idx + 1}`} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium" style={{ color: "var(--arc-text)" }}>Page {idx + 1}</div>
                  {p.originalName && (
                    <div className="text-[10px] truncate" style={{ color: "var(--arc-muted)" }}>{p.originalName}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePage(idx)}
                  className="rounded-[7px] px-2.5 py-1 text-[10px] font-medium transition-all hover:opacity-80"
                  style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "var(--arc-rose)", cursor: "pointer" }}
                >
                  Устгах
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
