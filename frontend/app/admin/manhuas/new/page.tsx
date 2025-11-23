/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/manhuas/new/page.tsx
"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NewManhuaPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">(
    "ongoing"
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let coverImageUrl: string | undefined;

      // эхлээд cover-ийг Cloudinary руу upload хийх
      if (coverFile) {
        const formData = new FormData();
        formData.append("image", coverFile);

        const uploadRes = await api.post("/uploads/image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        coverImageUrl = uploadRes.data.url;
      }

      await api.post("/manhuas", {
        title,
        slug,
        description,
        status,
        coverImageUrl,
      });

      router.push("/admin/manhuas");
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "Манхуа үүсгэхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-100">
        Шинэ манхуа үүсгэх
      </h1>
      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 text-xs">
            <label className="text-slate-300">Title</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1 text-xs">
            <label className="text-slate-300">Slug</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <label className="text-slate-300">Тайлбар</label>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1 text-xs">
          <label className="text-slate-300">Төлөв</label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "ongoing" | "completed" | "hiatus")
            }
          >
            <option value="ongoing">Одоо үргэлжилж буй</option>
            <option value="completed">Дууссан</option>
            <option value="hiatus">Завсарласан</option>
          </select>
        </div>

        <div className="space-y-1 text-xs">
          <label className="text-slate-300">Cover зураг</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
          />
          {coverFile && (
            <p className="text-[11px] text-slate-400">
              Сонгосон файл: {coverFile.name}
            </p>
          )}
        </div>

        <button
          disabled={loading}
          className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {loading ? "Хадгалж байна..." : "Манхуа үүсгэх"}
        </button>
      </form>
    </div>
  );
}
