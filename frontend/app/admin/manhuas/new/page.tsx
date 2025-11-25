/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent, ChangeEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import { uploadImage, editorCreateManhua } from "@/lib/api";

const GENRE_OPTIONS = [
  "Romance",
  "Comedy",
  "Drama",
  "Action",
  "Fantasy",
  "Slice of Life",
  "School",
  "Isekai",
  "Adventure",
];

export default function NewManhuaPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">(
    "ongoing"
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // title → автоматаар slug гаргах (slug хоосон байвал)
  const autoSlug = useMemo(
    () =>
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    [title]
  );

  const effectiveSlug = slug || autoSlug;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    } else {
      setCoverPreview(null);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title хоосон байна.");
      return;
    }

    setSaving(true);
    try {
      let coverImageUrl: string | undefined;

      // 1) cover upload
      if (coverFile) {
        const result = await uploadImage(coverFile); // { url }
        coverImageUrl = (result as any).url;
      }

      // 2) manhua үүсгэх (editor endpoint)
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        slug: effectiveSlug || undefined,
        genres: selectedGenres,
        coverImage: coverImageUrl,
        coverImageUrl,
      };

      const manhua = await editorCreateManhua(payload);

      // 3) амжилттай бол шууд admin manage руу үсэрнэ
      router.push(`/admin/manhuas/${manhua._id}`);
    } catch (err: any) {
      console.error("[NewManhua] create error:", err);
      setError(
        err?.response?.data?.message || "Манхуа үүсгэх үед алдаа гарлаа"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Шинэ манхуа"
      subtitle="Гарчиг, slug, жанр, төлөв, cover зурагтай шинэ манхуа үүсгэнэ."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)] pb-10">
        {/* LEFT – FORM */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-lg shadow-black/40">
          {error && (
            <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title + Slug */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  Title<span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
                  placeholder="Жишээ: Solo Leveling"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  Slug
                  <span className="ml-1 text-[10px] text-slate-500">
                    (/manhua/slug)
                  </span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
                  placeholder={autoSlug || "solo-leveling"}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-[10px] text-slate-500">
                  Үр дүн:{" "}
                  <span className="font-mono text-slate-200">
                    /manhua/{effectiveSlug || "<slug>"}
                  </span>
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">Тайлбар</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
                placeholder="Товч агуулга, гол санаа, уншигчдад өгөх мэдрэмж гэх мэт..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Status + Genres */}
            <div className="grid gap-3 md:grid-cols-[1.1fr,2fr]">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Төлөв</label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "ongoing" | "completed" | "hiatus"
                    )
                  }
                >
                  <option value="ongoing">Одоо үргэлжилж буй</option>
                  <option value="completed">Дууссан</option>
                  <option value="hiatus">Завсарласан</option>
                </select>
              </div>

              {/* Genre chips */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  Genres (сонгох)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_OPTIONS.map((g) => {
                    const active = selectedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                          active
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
                {selectedGenres.length > 0 && (
                  <p className="text-[10px] text-slate-500">
                    Сонгосон:{" "}
                    <span className="text-slate-200">
                      {selectedGenres.join(", ")}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow shadow-emerald-500/40 disabled:opacity-60"
              >
                {saving ? "Хадгалж байна..." : "Манхуа үүсгэх"}
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT – COVER PREVIEW */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
          {coverPreview && (
            <div className="pointer-events-none absolute inset-0 opacity-25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="Cover bg"
                className="h-full w-full object-cover blur-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>
          )}

          <div className="relative z-10 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-100">
                Cover зураг
              </p>
              <p className="text-[11px] text-slate-400">
                JPG / PNG сонгоод, upload хийгдээгүй бол default зураг ашиглагдана.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-100 shadow shadow-black/40 hover:bg-slate-800">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {coverFile ? "Файл солих" : "Файл сонгох"}
            </label>

            <div className="mt-2 flex justify-center">
              <div className="aspect-[3/4] w-40 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    coverPreview ||
                    "https://via.placeholder.com/300x400?text=Cover"
                  }
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {coverFile && (
              <p className="mt-1 text-center text-[11px] text-slate-400">
                Сонгосон файл:{" "}
                <span className="font-medium text-slate-200">
                  {coverFile.name}
                </span>
              </p>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}