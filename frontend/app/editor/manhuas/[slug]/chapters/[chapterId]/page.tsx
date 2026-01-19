/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";

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
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Load chapter
  useEffect(() => {
    if (!chapterId) return;

    async function load() {
      try {
        setLoading(true);
        const res = await api.get<Chapter>(`/editor/chapters/${chapterId}`);
        const ch = res.data;
        setChapter(ch);
        setPages(
          (ch.pages || []).slice().sort((a, b) => a.pageNumber - b.pageNumber)
        );
        setChapterNumber(ch.chapterNumber);
        setTitle(ch.title || "");
        setStatus((ch.status as "published" | "draft") || "published");
      } catch (e: any) {
        console.error(e);
        setError("Chapter уншихад алдаа гарлаа");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [chapterId]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  // Save metadata
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

      setChapter({
        ...chapter,
        chapterNumber,
        title,
        status,
        pages,
      });
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Chapter-ийн мэдээллийг хадгалах үед алдаа гарлаа"
      );
    } finally {
      setSavingMeta(false);
    }
  };

  // Save pages
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
      console.error(e);
      setError(e.response?.data?.message || "Хадгалах явцад алдаа гарлаа");
    } finally {
      setSavingPages(false);
    }
  };

  // Add images
  const handleAddImages = async () => {
    if (!files || !chapter) {
      setError("Файл сонгоно уу");
      return;
    }
    try {
      setError(null);
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      const uploaded = await Promise.all(
        fileArr.map(async (f) => {
          const r = await uploadImage(f);
          return (r as any).url || (r as any).secure_url || r.url;
        })
      );

      const currentLen = pages.length;
      const newPages: ChapterPage[] = uploaded.map((url, idx) => ({
        pageNumber: currentLen + idx + 1,
        imageUrl: url,
        originalName: fileArr[idx]?.name || undefined,
      }));

      const merged = [...pages, ...newPages].map((p, idx) => ({
        pageNumber: idx + 1,
        imageUrl: p.imageUrl,
        originalName: p.originalName,
      }));

      await saveChapterPages(merged);
      setFiles(null);
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.message || "Page нэмэхэд алдаа гарлаа");
    }
  };

  // Remove page
  const handleRemovePage = async (index: number) => {
    if (!chapter) return;
    if (!confirm("Энэ page-ийг устгах уу?")) return;

    const remaining = pages
      .filter((_, i) => i !== index)
      .map((p, idx) => ({
        pageNumber: idx + 1,
        imageUrl: p.imageUrl,
        originalName: p.originalName,
      }));

    await saveChapterPages(remaining);
  };

  // Drag & Drop
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;

    const updated = [...pages];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);

    const reIndexed = updated.map((p, idx) => ({
      pageNumber: idx + 1,
      imageUrl: p.imageUrl,
      originalName: p.originalName,
    }));

    setDragIndex(null);
    await saveChapterPages(reIndexed);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-400">Уншиж байна...</div>
      </div>
    );
  if (!chapter)
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        Chapter олдсонгүй
      </div>
    );

  return (
    <div className="space-y-6">
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
            Edit Chapter {chapter.chapterNumber}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Chapter мэдээлэл болон page-үүдийг удирдана.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
        {/* Left - Metadata */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Chapter мэдээлэл
          </h2>
          <form onSubmit={handleSaveMeta} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Chapter number
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(Number(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Title</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Жишээ: First Encounter"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

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

            <button
              type="submit"
              disabled={savingMeta}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 transition"
            >
              {savingMeta ? "Хадгалж байна..." : "Meta хадгалах"}
            </button>
          </form>
        </section>

        {/* Right - Pages */}
        <div className="space-y-6">
          {/* Preview Toggle */}
          {pages.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">
                  Preview
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
                >
                  {showPreview ? "Харуулахгүй" : "Харуулах"}
                </button>
              </div>
              {showPreview && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <ChapterPreview pages={pages} title={title} chapterNumber={chapterNumber} />
                </div>
              )}
            </section>
          )}

          {/* Add Images */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Шинэ page-үүд нэмэх
            </h2>
            <div className="space-y-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-400 transition"
              />
              {files && files.length > 0 && (
                <p className="text-xs text-slate-400">
                  Сонгосон {files.length} файл – одоогийн {pages.length}{" "}
                  page-ийн араас автоматаар залгаж, дахин 1..N гэж дугаарлана.
                </p>
              )}
              <button
                disabled={savingPages || !files?.length}
                onClick={handleAddImages}
                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {savingPages ? "Хадгалж байна..." : "Шинэ page-үүд хадгалах"}
              </button>
            </div>
          </section>

          {/* Pages List */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Pages жагсаалт ({pages.length})
            </h2>
            {pages.length === 0 ? (
              <p className="text-sm text-slate-400">
                Одоогоор page алга. Дээрээс зураг нэмж эхэлнэ үү.
              </p>
            ) : (
              <ul className="space-y-2">
                {pages.map((p, idx) => (
                  <li
                    key={`${p.imageUrl}-${idx}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    className={`flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 transition ${
                      dragIndex === idx ? "opacity-50" : "hover:bg-slate-900"
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="flex h-full cursor-grab select-none items-center pr-1 text-slate-500">
                      <span className="leading-none">⋮⋮</span>
                    </div>

                    {/* Thumbnail */}
                    <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                      <img
                        src={p.imageUrl}
                        alt={`Page ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-100">
                          Page {idx + 1}
                        </span>
                        {p.originalName && (
                          <span className="text-xs text-slate-500 truncate" title={p.originalName}>
                            {p.originalName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemovePage(idx)}
                      className="rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition flex-shrink-0"
                    >
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

// Chapter Preview Component
function ChapterPreview({
  pages,
  title,
  chapterNumber,
}: {
  pages: ChapterPage[];
  title: string;
  chapterNumber: number;
}) {
  return (
    <div className="w-full max-h-[600px] overflow-y-auto bg-slate-900 rounded-lg">
      <div className="mx-auto max-w-3xl">
        {/* Chapter Title Preview */}
        {title && (
          <div className="w-full px-4 py-4 sm:px-6 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wide">
                Chapter {chapterNumber}
              </span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-100 leading-relaxed">
              <span className="text-slate-400">(</span>
              {title}
              <span className="text-slate-400">)</span>
            </h2>
          </div>
        )}

        {/* Pages Preview */}
        <div className="space-y-0">
          {pages.map((p, idx) => (
            <div key={`preview-${p.pageNumber}-${idx}`} className="w-full">
              <img
                src={p.imageUrl}
                alt={`Page ${p.pageNumber}`}
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
