/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/manhuas/[slug]/chapters/new/page.tsx
"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadImage } from "@/lib/api";

interface ChapterPageInput {
  pageNumber: number;
  imageUrl: string;
}

export default function AdminNewChapterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [files, setFiles] = useState<FileList | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!slug) {
      alert("Manhua slug олдсонгүй");
      return;
    }
    if (!files || files.length === 0) {
      alert("Ядаж нэг зураг сонгоно уу");
      return;
    }

    try {
      setSubmitting(true);

      // 1) Бүх зургийг дарааллаар нь uploadImage() ашиглаж Cloudinary руу upload хийх
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        // uploadImage → POST /api/upload  (field name: "image")
        const result = await uploadImage(file); // { url }
        uploadedUrls.push((result as any).url);
      }

      if (!uploadedUrls.length) {
        alert("Зураг upload болоогүй байна");
        return;
      }

      // 2) Pages массив бэлдэх (1..N)
      const pages: ChapterPageInput[] = uploadedUrls.map((url, idx) => ({
        pageNumber: idx + 1,
        imageUrl: url,
      }));

     await api.post(`/editor/manhuas/${slug}/chapters`, {
       chapterNumber,
       title,
       pages,
       language: "mn",
       status, // "published" эсвэл "draft"
     });

      // 4) Амжилттай бол chapter list рүү буцаах
      router.push(`/editor/manhuas/${slug}/chapters`);
    } catch (e: any) {
      console.error(e);
      alert(
        e?.response?.data?.message ||
          "Шинэ chapter үүсгэхэд алдаа гарлаа (admin)"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 pb-8 pt-3 text-xs text-slate-100 sm:px-4">
      {/* HEADER */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold sm:text-base">
            Шинэ chapter нэмэх
          </h1>
          <p className="text-[11px] text-slate-400 sm:text-xs">
            Manhua:{" "}
            <span className="font-mono text-slate-200">
              {slug || "(slug байхгүй)"}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
          className="self-start rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300 sm:self-auto"
        >
          Chapter жагсаалт руу буцах
        </button>
      </div>

      {/* FORM CARD */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-lg shadow-black/50"
      >
        {/* row: chapter number + status */}
        <div className="grid gap-3 sm:grid-cols-[0.9fr,1.1fr]">
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
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Status</label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "published" | "draft")
              }
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* title */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">Chapter title</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
            placeholder="Жишээ: First Encounter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* files */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">
            Зургийн файлууд (олон сонгож болно)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1 file:text-[11px] file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
          />
          {files && files.length > 0 && (
            <p className="text-[10px] text-slate-400">
              Сонгосон {files.length} зураг – дарааллаар нь page 1..N болж орно.
            </p>
          )}
        </div>

        {/* submit */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => router.push(`/editor/manhuas/${slug}/chapters`)}
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
          >
            Цуцлах
          </button>
          <button
            type="submit"
            disabled={submitting || !files?.length}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-1.5 text-[11px] font-semibold text-slate-950 shadow shadow-emerald-500/40 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {submitting ? "Үүсгэж байна..." : "Chapter үүсгэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
