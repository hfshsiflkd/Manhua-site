/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";

interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  pages: ChapterPage[];
  language?: string;
  status?: "published" | "draft";
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

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // ---------- LOAD ----------
  useEffect(() => {
    if (!chapterId) return;

    async function load() {
      try {
        // ADMIN endpoint
        const res = await api.get<Chapter>(`/admin/chapters/${chapterId}`);
        const ch = res.data;
        setChapter(ch);
        setPages(
          (ch.pages || []).slice().sort((a, b) => a.pageNumber - b.pageNumber)
        );

        setChapterNumber(ch.chapterNumber);
        setTitle(ch.title || "");
        setStatus((ch.status as "published" | "draft") || "published");
      } catch (e) {
        console.error(e);
        alert("Chapter уншихад алдаа гарлаа");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [chapterId]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  // ---------- SAVE META ----------
  const handleSaveMeta = async (e: FormEvent) => {
    e.preventDefault();
    if (!chapter) return;

    try {
      setSavingMeta(true);
      await api.put(`/admin/chapters/${chapterId}`, {
        chapterNumber,
        title,
        status,
        pages, // одоогийн pages-ийг хамтад нь явуулна
      });

      setChapter({
        ...chapter,
        chapterNumber,
        title,
        status,
        pages,
      });

      alert("Meta мэдээлэл хадгалагдлаа");
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.message ||
          "Chapter-ийн мэдээллийг хадгалах үед алдаа гарлаа"
      );
    } finally {
      setSavingMeta(false);
    }
  };

  // ---------- SAVE PAGES ----------
  const saveChapterPages = async (updatedPages: ChapterPage[]) => {
    if (!chapter) return;
    setSavingPages(true);
    try {
      await api.put(`/admin/chapters/${chapterId}`, {
        chapterNumber,
        title,
        status,
        pages: updatedPages,
      });
      setChapter({ ...chapter, pages: updatedPages });
      setPages(updatedPages);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "Хадгалах явцад алдаа гарлаа");
    } finally {
      setSavingPages(false);
    }
  };

  // ---------- ADD IMAGES (uploadImage helper ашиглана) ----------
  const handleAddImages = async () => {
    if (!files || !chapter) {
      alert("Файл сонгоно уу");
      return;
    }
    try {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      const uploaded = await Promise.all(
        fileArr.map(async (f) => {
          const r = await uploadImage(f); // { url }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (r as any).url || (r as any).secure_url || r.url;
        })
      );

      const currentLen = pages.length;
      const newPages: ChapterPage[] = uploaded.map((url, idx) => ({
        pageNumber: currentLen + idx + 1,
        imageUrl: url,
      }));

      const merged = [...pages, ...newPages].map((p, idx) => ({
        pageNumber: idx + 1,
        imageUrl: p.imageUrl,
      }));

      await saveChapterPages(merged);
      setFiles(null);
      alert("Шинэ page-үүд нэмэгдлээ");
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "Page нэмэхэд алдаа гарлаа");
    }
  };

  // ---------- REMOVE PAGE ----------
  const handleRemovePage = async (index: number) => {
    if (!chapter) return;
    if (!confirm("Энэ page-ийг устгах уу?")) return;

    const remaining = pages
      .filter((_, i) => i !== index)
      .map((p, idx) => ({
        pageNumber: idx + 1,
        imageUrl: p.imageUrl,
      }));

    await saveChapterPages(remaining);
  };

  // ---------- DRAG & DROP ----------
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
    }));

    setDragIndex(null);
    await saveChapterPages(reIndexed);
  };

  if (loading)
    return <div className="text-xs text-slate-300">Уншиж байна...</div>;
  if (!chapter)
    return <div className="text-xs text-red-400">Chapter олдсонгүй</div>;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 pb-8 pt-3 text-xs text-slate-100 sm:px-4">
      {/* HEADER */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold sm:text-base">
            Edit chapter – Ch. {chapter.chapterNumber}
          </h1>
          <p className="text-[11px] text-slate-400 sm:text-xs">
            Manhua:{" "}
            <span className="font-mono text-slate-200">
              {slug || "(slug байхгүй)"}
            </span>
          </p>
        </div>
        <button
          onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
          className="self-start rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300 sm:self-auto"
        >
          Chapter жагсаалт руу буцах
        </button>
      </div>

      {/* META FORM */}
      <form
        onSubmit={handleSaveMeta}
        className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-lg shadow-black/50"
      >
        <p className="text-[11px] font-semibold text-slate-200">
          Chapter мэдээлэл
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Chapter number</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(Number(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] text-slate-400">Title</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Жишээ: First Encounter"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">Status</label>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60 sm:w-48"
            value={status}
            onChange={(e) => setStatus(e.target.value as "published" | "draft")}
          >
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={savingMeta}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow shadow-emerald-500/40 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {savingMeta ? "Хадгалж байна..." : "Meta хадгалах"}
          </button>
        </div>
      </form>

      {/* ADD IMAGES */}
      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="font-semibold text-slate-200 text-[11px]">
          Шинэ page-үүд нэмэх (олон зураг)
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1 file:text-[11px] file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
        />
        {files && files.length > 0 && (
          <p className="text-[10px] text-slate-400">
            Сонгосон {files.length} файл – одоогийн {pages.length} page-ийн
            араас автоматаар залгаж, дахин 1..N гэж дугаарлана.
          </p>
        )}
        <button
          disabled={savingPages || !files?.length}
          onClick={handleAddImages}
          className="mt-2 rounded-full bg-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {savingPages ? "Хадгалж байна..." : "Шинэ page-үүд хадгалах"}
        </button>
      </section>

      {/* PAGES LIST + DRAG & DROP */}
      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="font-semibold text-slate-200 text-[11px]">
          Pages жагсаалт (drag & drop)
        </p>
        {pages.length === 0 ? (
          <p className="text-[11px] text-slate-400">
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
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-2.5 py-2 text-[11px] text-slate-200"
              >
                {/* drag handle */}
                <div className="flex h-full cursor-grab select-none items-center pr-1 text-slate-500">
                  <span className="leading-none">⋮⋮</span>
                </div>

                {/* thumbnail */}
                <div className="h-14 w-10 overflow-hidden rounded-lg bg-slate-900 sm:h-16 sm:w-12">
                  <img
                    src={p.imageUrl}
                    alt={`Page ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* info */}
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-medium text-slate-100">
                    Page {idx + 1}
                  </span>
                </div>

                {/* delete */}
                <button
                  type="button"
                  onClick={() => handleRemovePage(idx)}
                  className="rounded-full px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
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
