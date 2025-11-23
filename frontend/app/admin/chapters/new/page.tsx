/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Manhua } from "@/types/manhua";

interface ManhuaListResponse {
  items: Manhua[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminCreateChapterPage() {
  const router = useRouter();

  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [chapterNumber, setChapterNumber] = useState<string>(""); // string болгочихсон
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<string[]>([]); // Cloudinary URL-ууд
  const [loadingManhuas, setLoadingManhuas] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Манхуа жагсаалтыг ачааллах
  useEffect(() => {
    async function loadManhuas() {
      try {
        setLoadingManhuas(true);
        const res = await api.get<ManhuaListResponse>("/manhuas", {
          params: { page: 1, limit: 500 },
        });
        setManhuas(res.data.items || []);
        if (res.data.items?.length) {
          setSelectedSlug(res.data.items[0].slug);
        }
      } catch (err: any) {
        console.error(err);
        setError("Манхуа жагсаалт ачаалахад алдаа гарлаа.");
      } finally {
        setLoadingManhuas(false);
      }
    }
    loadManhuas();
  }, []);

  // Нэг файл upload хийх helper
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<{ url: string }>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data.url;
  };

  // input[type=file] эвэнт
  const handleFilesChange = async (e: any) => {
    const files = e.target.files as FileList | null;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        uploadedUrls.push(url);
      }

      setPages((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Зураг upload хийх үед алдаа гарлаа."
      );
    } finally {
      setUploading(false);
      // input-ийг reset болгох
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSlug) {
      setError("Эхлээд манхуа сонгоно уу.");
      return;
    }

    const num = Number(chapterNumber);
    if (!chapterNumber || isNaN(num)) {
      setError("Chapter дугаарыг зөв оруулна уу.");
      return;
    }

    if (pages.length === 0) {
      setError("Ядаж нэг page-ийн зураг upload хийнэ үү.");
      return;
    }

    const payloadPages = pages.map((url, index) => ({
      pageNumber: index + 1,
      imageUrl: url,
    }));

    try {
      setSaving(true);
      await api.post(`/manhuas/${selectedSlug}/chapters`, {
        chapterNumber: num,
        title: title || `Chapter ${num}`,
        pages: payloadPages,
        status: "published",
      });

      alert("Chapter амжилттай нэмлээ!");

      // form-oo цэвэрлэнэ
      setChapterNumber("");
      setTitle("");
      setPages([]);
      // хүсвэл тухайн manhua detail рүү үсрүүлж болно
      // router.push(`/admin/manhuas/${selectedSlug}`);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Chapter нэмэх үед алдаа гарлаа."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedManhua = manhuas.find((m) => m.slug === selectedSlug);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
            Chapter нэмэх
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Одоо байгаа манхуунуудаас сонгож, нэг chapter дээр олон page-ийн
            зургуудыг file upload ашиглан нэмнэ.
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

      {/* Main form card */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70"
      >
        {/* Manhua select */}
        <div className="space-y-1">
          <label className="text-[12px] font-medium text-slate-200">
            Манхуа сонгох
          </label>
          {loadingManhuas ? (
            <p className="text-[12px] text-slate-400">Манхуа ачаалж байна...</p>
          ) : manhuas.length === 0 ? (
            <p className="text-[12px] text-slate-400">
              Одоогоор манхуа байхгүй байна. Эхлээд манхуа нэмнэ үү.
            </p>
          ) : (
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            >
              {manhuas.map((m) => (
                <option key={m._id} value={m.slug}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          {selectedManhua && (
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
              {selectedManhua.coverImageUrl && (
                <img
                  src={selectedManhua.coverImageUrl}
                  alt={selectedManhua.title}
                  className="h-10 w-8 rounded object-cover"
                />
              )}
              <div>
                <p className="text-slate-200">{selectedManhua.title}</p>
                <p className="text-[10px] uppercase text-cyan-300">
                  {selectedManhua.status}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chapter info */}
        <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-сlate-200">
              Chapter гарчиг (optional)
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

        {/* Pages - upload хэсэг */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-[12px] font-medium text-slate-200">
              Pages (зураг upload)
            </label>

            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesChange}
                className="text-[11px] text-slate-200 file:mr-2 file:rounded-full file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-950 file:hover:bg-cyan-400"
              />
              {uploading && (
                <span className="text-[11px] text-slate-400">
                  Upload хийж байна...
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {pages.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Одоогоор ямар ч page upload хийгдээгүй байна.
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
                  alt="page"
                  className="h-16 w-12 rounded object-cover"
                />
                <div className="flex-1 truncate text-[11px] text-slate-400">
                  {url}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPages((prev) => prev.filter((_, i) => i !== index))
                  }
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
            disabled={
              saving || uploading || loadingManhuas || manhuas.length === 0
            }
            className="w-full rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Хадгалж байна..." : "Chapter нэмэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
