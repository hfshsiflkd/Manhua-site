"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
  status?: string;
}

export default function AdminEditChapterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const chapterId = params?.chapterId as string;
  const router = useRouter();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    if (!chapterId) return;

    async function load() {
      try {
        const res = await api.get<Chapter>(`/chapters/${chapterId}`);
        setChapter(res.data);
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

  const saveChapterPages = async (updatedPages: ChapterPage[]) => {
    if (!chapter) return;
    setSaving(true);
    try {
      await api.put(`/chapters/${chapterId}`, {
        title: chapter.title,
        pages: updatedPages,
        language: chapter.language ?? "mn",
        status: chapter.status ?? "published",
      });
      setChapter({ ...chapter, pages: updatedPages });
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "Хадгалах явцад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleAddImages = async () => {
    if (!files || !chapter) {
      alert("Файл сонгоно уу");
      return;
    }
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));

      const uploadRes = await api.post<{ images: { url: string }[] }>(
        "/uploads/images",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const images = uploadRes.data.images || [];
      if (!images.length) return;

      const currentLen = chapter.pages?.length || 0;
      const newPages: ChapterPage[] = images.map((img, idx) => ({
        pageNumber: currentLen + idx + 1,
        imageUrl: img.url,
      }));

      const merged = [...(chapter.pages || []), ...newPages].map((p, idx) => ({
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

  const handleRemovePage = async (index: number) => {
    if (!chapter) return;
    if (!confirm("Энэ page-ийг устгах уу?")) return;

    const remaining = chapter.pages
      .filter((_, i) => i !== index)
      .map((p, idx) => ({
        pageNumber: idx + 1,
        imageUrl: p.imageUrl,
      }));

    await saveChapterPages(remaining);
  };

  if (loading) return <div>Уншиж байна...</div>;
  if (!chapter) return <div>Chapter олдсонгүй</div>;

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">
          Edit pages – Ch. {chapter.chapterNumber}
        </h1>
        <button
          onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
          className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
        >
          Chapter жагсаалт руу буцах
        </button>
      </div>

      {/* Add new pages */}
      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs">
        <p className="font-semibold text-slate-200">
          Шинэ page-үүд нэмэх (олон зураг)
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
        />
        {files && files.length > 0 && (
          <p className="text-[11px] text-slate-400">
            Сонгосон {files.length} файл – одоогийн {chapter.pages.length} page-ийн
            араас автоматаар залгаж, дахин 1..N гэж дугаарлана.
          </p>
        )}
        <button
          disabled={saving || !files?.length}
          onClick={handleAddImages}
          className="mt-2 rounded-full bg-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {saving ? "Хадгалж байна..." : "Шинэ page-үүд хадгалах"}
        </button>
      </section>

      {/* Existing pages */}
      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs">
        <p className="font-semibold text-slate-200">
          Одоо байгаа pages ({chapter.pages.length})
        </p>
        {chapter.pages.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            Одоогоор page алга. Дээрээс зураг нэмж эхэлнэ үү.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {chapter.pages.map((p, idx) => (
              <div
                key={idx}
                className="space-y-1 rounded-xl border border-slate-800 bg-slate-950/70 p-2"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Page {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePage(idx)}
                    className="text-[10px] text-rose-400 hover:text-rose-300"
                  >
                    Устгах
                  </button>
                </div>
                <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-900">
                  <img
                    src={p.imageUrl}
                    alt={`Page ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
