/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent, ChangeEvent, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, editorCreateManhua, editorGetTeams, Team } from "@/lib/api";

const GENRE_OPTIONS = ["Romance", "Comedy", "Drama", "Action", "Fantasy", "Slice of Life", "School", "Isekai", "Adventure"];

export default function EditorNewManhuaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">("ongoing");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldStyle: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)", borderRadius: 9, padding: "10px 16px", fontSize: 13, outline: "none", width: "100%" };

  const autoSlug = useMemo(() => {
    const base = (titleEn && titleEn.trim()) || title;
    return base.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  }, [title, titleEn]);

  const effectiveSlug = slug || autoSlug;

  useEffect(() => {
    let active = true;
    editorGetTeams().then((data) => { if (!active) return; setTeams(Array.isArray(data) ? data : []); })
      .catch(() => { if (!active) return; setTeams([]); });
    return () => { active = false; };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    if (file) { setCoverPreview(URL.createObjectURL(file)); setCoverProgress(null); }
    else { setCoverPreview(null); setCoverProgress(null); }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("Title хоосон байна."); return; }
    setSaving(true);
    try {
      let coverImageUrl: string | undefined;
      if (coverFile) {
        setUploadingCover(true); setCoverProgress(0);
        try {
          const result = await uploadImage(coverFile, (p) => setCoverProgress(p));
          coverImageUrl = (result as any).url; setCoverProgress(100);
        } finally { setUploadingCover(false); }
      }
      const manhua = await editorCreateManhua({
        title: title.trim(), titleEn: titleEn.trim() || undefined, description: description.trim() || undefined,
        status, slug: effectiveSlug || undefined, genres: selectedGenres,
        coverImage: coverImageUrl, coverImageUrl, teamId: teamId || undefined,
      });
      router.push(`/editor/manhuas/${manhua.slug || manhua._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Манхуа үүсгэх үед алдаа гарлаа");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>Шинэ манхуа үүсгэх</h1>
        <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Шинэ манхуа-аа үүсгэж, үндсэн мэдээллээ оруулна уу.</p>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        <div className="space-y-6">
          <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Үндсэн мэдээлэл</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Title <span style={{ color: "oklch(0.75 0.2 15)" }}>*</span></label>
                <input type="text" style={fieldStyle} placeholder="Жишээ: Solo Leveling" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Title (EN)</label>
                <input type="text" style={fieldStyle} placeholder="English title (optional)" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Slug <span className="ml-1 text-xs" style={{ color: "var(--arc-muted)" }}>(автоматаар үүснэ)</span></label>
                <input type="text" style={{ ...fieldStyle, fontFamily: "monospace" }} placeholder={autoSlug || "solo-leveling"} value={slug} onChange={(e) => setSlug(e.target.value)} />
                <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>URL: <span className="font-mono" style={{ color: "var(--arc-dim)" }}>/manhua/{effectiveSlug || "<slug>"}</span></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Тайлбар</label>
                <textarea style={{ ...fieldStyle, resize: "none" }} placeholder="Товч агуулга, гол санаа..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Төлөв</label>
                <select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value as "ongoing" | "completed" | "hiatus")}>
                  <option value="ongoing">Одоо үргэлжилж буй</option>
                  <option value="completed">Дууссан</option>
                  <option value="hiatus">Завсарласан</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Баг</label>
                <select style={fieldStyle} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">Баггүй (хувийн)</option>
                  {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
                <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Баг сонговол тухайн багийн гишүүд хамт ажиллаж чадна.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((g) => {
                    const active = selectedGenres.includes(g);
                    return (
                      <button key={g} type="button" onClick={() => toggleGenre(g)}
                        className="rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                        style={active
                          ? { border: "1px solid oklch(0.72 0.17 195/.6)", background: "oklch(0.72 0.17 195/.15)", color: "var(--arc-cyan)" }
                          : { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
                        {g}
                      </button>
                    );
                  })}
                </div>
                {selectedGenres.length > 0 && (
                  <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
                    Сонгосон: <span style={{ color: "var(--arc-dim)" }}>{selectedGenres.join(", ")}</span>
                  </p>
                )}
              </div>
            </form>
          </section>

          <div className="hidden lg:flex sticky bottom-6 items-center justify-end gap-3 rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}>
            <button type="button" onClick={() => router.push("/editor/manhuas")}
              className="rounded-[9px] px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
              Цуцлах
            </button>
            <button type="submit" onClick={handleSubmit} disabled={saving}
              className="rounded-[9px] px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
              {saving ? "Хадгалж байна..." : "Манхуа үүсгэх"}
            </button>
          </div>

          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-[14px] p-4" style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}>
            <div className="flex gap-3 max-w-7xl mx-auto">
              <button type="button" onClick={() => router.push("/editor/manhuas")}
                className="flex-1 rounded-[9px] px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
                Цуцлах
              </button>
              <button type="submit" onClick={handleSubmit} disabled={saving}
                className="flex-1 rounded-[9px] px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
                {saving ? "Хадгалж байна..." : "Үүсгэх"}
              </button>
            </div>
          </div>
        </div>

        {/* Cover Preview */}
        <div className="relative overflow-hidden rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          {coverPreview && (
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <img src={coverPreview} alt="Cover bg" className="h-full w-full object-cover blur-2xl scale-110" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--arc-bg) 30%, transparent)" }} />
            </div>
          )}
          <div className="relative z-10 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--arc-text)" }}>Cover зураг</h3>
              <p className="text-xs" style={{ color: "var(--arc-muted)" }}>JPG / PNG сонгоод upload хийгдээгүй бол default зураг ашиглагдана.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-[9px] px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {coverFile ? "Файл солих" : "Файл сонгох"}
            </label>
            <div className="flex justify-center">
              <div className="aspect-[3/4] w-full max-w-[192px] sm:w-48 overflow-hidden rounded-[10px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                <img src={coverPreview || "https://via.placeholder.com/300x400?text=No+Cover"} alt="Cover preview" className="h-full w-full object-cover" />
              </div>
            </div>
            {coverProgress !== null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  <span>{uploadingCover ? "Upload хийж байна..." : "Upload"}</span>
                  <span className="font-mono" style={{ color: "var(--arc-text)" }}>{coverProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
                  <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${coverProgress}%`, background: "var(--arc-cyan)" }} />
                </div>
              </div>
            )}
            {coverFile && (
              <p className="text-center text-xs" style={{ color: "var(--arc-muted)" }}>
                Сонгосон файл: <span className="font-medium" style={{ color: "var(--arc-dim)" }}>{coverFile.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
