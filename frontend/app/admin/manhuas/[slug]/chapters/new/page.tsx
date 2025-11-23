"use client";

import { FormEvent, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface UploadImageResult {
  url: string;
  publicId: string;
}

export default function NewChapterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chapterNumber) {
      alert("Chapter дугаараа оруулна уу (жишээ нь: 1)");
      return;
    }
    if (!files || files.length === 0) {
      alert("Хуудасны зургуудыг сонгоно уу");
      return;
    }

    setLoading(true);
    try {
      // 1) Бүх зургаа нэг дор upload хийнэ
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("images", file);
      });

      const uploadRes = await api.post<{ images: UploadImageResult[] }>(
        "/uploads/images",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const images = uploadRes.data.images;
      if (!images || images.length === 0) {
        alert("Зураг upload хийхэд алдаа гарлаа");
        setLoading(false);
        return;
      }

      // 2) pages массив – нэг chapter дотор олон page
      const pages = images.map((img, index) => ({
        pageNumber: index + 1,      // Page 1, 2, 3, ...
        imageUrl: img.url,
      }));

      // 3) Chapter-аа нэг дор үүсгэнэ (олон page-тэй)
      await api.post(`/manhuas/${slug}/chapters`, {
        chapterNumber: Number(chapterNumber),
        title,
        language: "mn",
        status: "published",
        pages,
      });

      alert("Chapter олон page-тайгаар амжилттай үүслээ 🎉");
      router.push(`/admin/manhuas/${slug}/chapters`);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "Chapter үүсгэхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Шинэ Chapter үүсгэх</h1>
        <button
          type="button"
          onClick={() => router.push(`/admin/manhuas/${slug}/chapters`)}
          className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
        >
          Chapter жагсаалт руу буцах
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-slate-300">Chapter дугаар</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              placeholder="ж: 1"
              value={chapterNumber}
              onChange={(e) =>
                setChapterNumber(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300">Гарчиг (optional)</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              placeholder="ж: First Encounter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-slate-300">Хуудасны зурагнууд (олон)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
          />
          {files && files.length > 0 && (
            <p className="text-[11px] text-slate-400">
              Сонгосон {files.length} файл – энэ chapter дотор {files.length} page
              болно.
            </p>
          )}
          <p className="text-[10px] text-slate-500">
            * Файлын нэрийг 001, 002, 003... гэх мэт дарааллаар байлгавал page
            order зөв дарааллаар орно.
          </p>
        </div>

        {/* Preview – UX талаасаа олон page гэдгийг ойлгоход */}
        {files && files.length > 0 && (
          <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-[11px] font-semibold text-slate-200">
              Энэ chapter доторх page-үүд:
            </p>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-[11px] text-slate-300">
              {Array.from(files).map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-slate-900/70 px-2 py-1"
                >
                  <span>Page {index + 1}</span>
                  <span className="max-w-[140px] truncate text-slate-400">
                    {file.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <button
            disabled={loading}
            className="rounded-full bg-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? "Хадгалж байна..." : "Chapter үүсгэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
