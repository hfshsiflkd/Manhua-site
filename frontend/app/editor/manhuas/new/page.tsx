/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent, ChangeEvent, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, editorCreateManhua, editorGetTeams, Team } from "@/lib/api";

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

export default function EditorNewManhuaPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">(
    "ongoing"
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from title
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

  useEffect(() => {
    let active = true;
    editorGetTeams()
      .then((data) => {
        if (!active) return;
        setTeams(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setTeams([]);
      });
    return () => {
      active = false;
    };
  }, []);

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

      if (coverFile) {
        const result = await uploadImage(coverFile);
        coverImageUrl = (result as any).url;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        slug: effectiveSlug || undefined,
        genres: selectedGenres,
        coverImage: coverImageUrl,
        coverImageUrl,
        teamId: teamId || undefined,
      };

      const manhua = await editorCreateManhua(payload);
      router.push(`/editor/manhuas/${manhua.slug || manhua._id}`);
    } catch (err: any) {
      console.error("[EditorNewManhua] create error:", err);
      setError(
        err?.response?.data?.message || "Манхуа үүсгэх үед алдаа гарлаа"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">
          Шинэ манхуа үүсгэх
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Шинэ манхуа-аа үүсгэж, үндсэн мэдээллээ оруулна уу.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Left - Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Үндсэн мэдээлэл
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Жишээ: Solo Leveling"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Slug
                  <span className="ml-2 text-xs text-slate-500">
                    (автоматаар үүснэ)
                  </span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono"
                  placeholder={autoSlug || "solo-leveling"}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  URL:{" "}
                  <span className="font-mono text-slate-300">
                    /manhua/{effectiveSlug || "<slug>"}
                  </span>
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Тайлбар
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                  placeholder="Товч агуулга, гол санаа, уншигчдад өгөх мэдрэмж гэх мэт..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Төлөв
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
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

              {/* Team */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Баг
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">Баггүй (хувийн)</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Баг сонговол тухайн багийн гишүүд хамт ажиллаж чадна.
                </p>
              </div>

              {/* Genres */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Genres
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((g) => {
                    const active = selectedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
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
                  <p className="text-xs text-slate-500">
                    Сонгосон:{" "}
                    <span className="text-slate-200">
                      {selectedGenres.join(", ")}
                    </span>
                  </p>
                )}
              </div>
            </form>
          </section>

          {/* Action Bar - Desktop Sticky, Mobile Fixed Bottom */}
          <div className="hidden lg:flex sticky bottom-6 items-center justify-end gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-xl backdrop-blur-sm">
            <button
              type="button"
              onClick={() => router.push("/editor/manhuas")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 transition"
            >
              {saving ? "Хадгалж байна..." : "Манхуа үүсгэх"}
            </button>
          </div>
          
          {/* Mobile Action Bar - Fixed Bottom */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-slate-800 bg-slate-950/95 p-4 shadow-xl backdrop-blur-sm">
            <div className="flex gap-3 max-w-7xl mx-auto">
              <button
                type="button"
                onClick={() => router.push("/editor/manhuas")}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
              >
                Цуцлах
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 transition"
              >
                {saving ? "Хадгалж байна..." : "Үүсгэх"}
              </button>
            </div>
          </div>
        </div>

        {/* Right - Cover Preview */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
          {coverPreview && (
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <img
                src={coverPreview}
                alt="Cover bg"
                className="h-full w-full object-cover blur-2xl scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>
          )}

          <div className="relative z-10 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">
                Cover зураг
              </h3>
              <p className="text-xs text-slate-400">
                JPG / PNG сонгоод upload хийгдээгүй бол default зураг
                ашиглагдана.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-800 transition">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {coverFile ? "Файл солих" : "Файл сонгох"}
            </label>

            <div className="flex justify-center">
              <div className="aspect-[3/4] w-full max-w-[192px] sm:w-48 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg">
                <img
                  src={
                    coverPreview ||
                    "https://via.placeholder.com/300x400?text=No+Cover"
                  }
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {coverFile && (
              <p className="text-center text-xs text-slate-400">
                Сонгосон файл:{" "}
                <span className="font-medium text-slate-200">
                  {coverFile.name}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
