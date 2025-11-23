/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

interface Chapter {
  _id: string;
  manhua:
    | string
    | {
        _id: string;
        title: string;
        slug: string;
        coverImageUrl?: string;
      };
  chapterNumber: number;
  title: string;
  pages: ChapterPage[];
  status: "draft" | "published" | string;
}

export default function AdminEditChapterPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = (params?.id as string) || "";

  const [chapter, setChapter] = useState<Chapter | null>(null);

  const [chapterNumber, setChapterNumber] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "published" | string>(
    "published"
  );
  const [pages, setPages] = useState<string[]>([]); // imageUrl-ууд

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chapter ачаалах
  useEffect(() => {
    if (!chapterId) return;

    async function loadChapter() {
      try {
        setLoading(true);
        const res = await api.get<Chapter>(`/chapters/${chapterId}`);

        const ch = res.data;
        setChapter(ch);
        setChapterNumber(String(ch.chapterNumber));
        setTitle(ch.title || "");
        setStatus(ch.status || "published");

        const ordered = (ch.pages || [])
          .slice()
          .sort((a, b) => a.pageNumber - b.pageNumber)
          .map((p) => p.imageUrl);

        setPages(ordered);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            "Chapter мэдээлэл ачаалахад алдаа гарлаа."
        );
      } finally {
        setLoading(false);
      }
    }

    loadChapter();
  }, [chapterId]);

  // Нэг файл upload helper
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<{ url: string }>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data.url;
  };

  // Олон шинэ page нэмэх (append)
  const handleFilesAppend = async (e: any) => {
    const files = e.target.files as FileList | null;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        uploaded.push(url);
      }
      setPages((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Зураг upload хийх үед алдаа гарлаа."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Нэг page-г шинэ зурагтайгаар солих
  const handleReplaceFile = async (index: number, e: any) => {
    const file = e.target.files?.[0] as File | undefined;
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const url = await uploadFile(file);
      setPages((prev) => {
        const copy = [...prev];
        copy[index] = url;
        return copy;
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Зураг солих үед алдаа гарлаа.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemovePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!chapterId) {
      setError("Chapter ID алга байна.");
      return;
    }

    const num = Number(chapterNumber);
    if (!chapterNumber || isNaN(num)) {
      setError("Chapter дугаарыг зөв оруулна уу.");
      return;
    }

    if (pages.length === 0) {
      setError("Ядаж нэг page байх ёстой.");
      return;
    }

    const payloadPages = pages.map((url, index) => ({
      pageNumber: index + 1,
      imageUrl: url,
    }));

    try {
      setSaving(true);
      await api.put(`/chapters/${chapterId}`, {
        chapterNumber: num,
        title: title || `Chapter ${num}`,
        status,
        pages: payloadPages,
      });

      alert("Chapter амжилттай шинэчлэгдлээ!");
      // хүсвэл эндээс manhua detail рүү redirect хийж болно
      // if (typeof chapter?.manhua === "object") {
      //   router.push(`/admin/manhuas/${chapter.manhua.slug}`);
      // }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Chapter шинэчлэх үед алдаа гарлаа."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Chapter ачаалж байна...
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-sm text-red-400">
        <p>Chapter олдсонгүй.</p>
        <button
          onClick={() => router.push("/admin")}
          className="text-xs text-slate-300 underline-offset-2 hover:underline"
        >
          Admin dashboard руу буцах
        </button>
      </div>
    );
  }

  const manhuaTitle =
    typeof chapter.manhua === "object"
      ? chapter.manhua.title
      : "Тодорхой бус манхуа";

  const manhuaCover =
    typeof chapter.manhua === "object"
      ? chapter.manhua.coverImageUrl
      : undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
            Chapter засах
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            {manhuaTitle} — Chapter {chapter.chapterNumber}
          </p>
        </div>

        <button
          onClick={() => router.push("/admin")}
          className="self-start rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
        >
          ← Admin dashboard
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
        {manhuaCover && (
          <img
            src={manhuaCover}
            alt={manhuaTitle}
            className="h-14 w-10 rounded object-cover"
          />
        )}
        <div>
          <p className="text-slate-100">{manhuaTitle}</p>
          <p className="text-[11px] text-slate-400">
            Chapter ID: {chapter._id}
          </p>
        </div>
      </div>

      {/* Main form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70"
      >
        {/* Chapter basic info */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-slate-200">
              Chapter дугаар
            </label>
            <input
              type="number"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Жишээ нь: 1"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-[12px] font-medium text-slate-200">
              Chapter гарчиг
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Жишээ нь: First Encounter"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-[12px] font-medium text-slate-200">
            Статус
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "draft" | "published" | string)
            }
            className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Pages edit */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-[12px] font-medium text-slate-200">
              Pages (зураг)
            </label>

            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesAppend}
                className="text-[11px] text-slate-200 file:mr-2 file:rounded-full file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-950 file:hover:bg-cyan-400"
              />
              {uploading && (
                <span className="text-[11px] text-slate-400">
                  Upload хийж байна...
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {pages.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Одоогоор нэг ч page байхгүй байна.
              </p>
            )}

            {pages.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2"
              >
                <span className="min-w-[40px] text-center text-[11px] text-slate-400">
                  #{index + 1}
                </span>
                <img
                  src={url}
                  alt={`page-${index + 1}`}
                  className="h-16 w-12 rounded object-cover"
                />
                <div className="flex-1 truncate text-[11px] text-slate-400">
                  {url}
                </div>

                <label className="cursor-pointer rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-700">
                  Солих
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleReplaceFile(index, e)}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleRemovePage(index)}
                  className="rounded-full bg-red-500/80 px-2 py-1 text-[10px] text-white hover:bg-red-500"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Хадгалж байна..." : "Chapter шинэчлэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
