/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, FormEvent, ChangeEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import { uploadImage, editorCreateManhua } from "@/lib/api";

const GENRE_OPTIONS = [
  "Romance", "Comedy", "Drama", "Action", "Fantasy",
  "Slice of Life", "School", "Isekai", "Adventure", "Martial Arts",
];

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "8px 12px", fontSize: 12,
  color: "var(--arc-text)", outline: "none",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
};

export default function NewManhuaPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">("ongoing");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSlug = useMemo(() => {
    const base = (titleEn && titleEn.trim()) || title;
    return base.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  }, [title, titleEn]);

  const effectiveSlug = slug || autoSlug;

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
        setUploadingCover(true);
        setCoverProgress(0);
        try {
          const result = await uploadImage(coverFile, (percent) => setCoverProgress(percent));
          coverImageUrl = (result as any).url;
          setCoverProgress(100);
        } finally {
          setUploadingCover(false);
        }
      }

      const manhua = await editorCreateManhua({
        title: title.trim(),
        titleEn: titleEn.trim() || undefined,
        description: description.trim() || undefined,
        status,
        slug: effectiveSlug || undefined,
        genres: selectedGenres,
        coverImage: coverImageUrl,
        coverImageUrl,
      });

      router.push(`/admin/manhuas/${manhua._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Манхуа үүсгэх үед алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)";
  };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "var(--arc-border)";
  };

  return (
    <AdminShell title="Шинэ манхуа" subtitle="Гарчиг, slug, жанр, төлөв, cover зурагтай шинэ манхуа үүсгэнэ.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)] pb-10">

        {/* LEFT – FORM */}
        <div
          className="rounded-[14px] p-5"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          {error && (
            <div className="mb-4 rounded-[8px] px-3 py-2 text-[11px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  Гарчиг <span style={{ color: "var(--arc-rose)" }}>*</span>
                </label>
                <input style={inputStyle} placeholder="Жишээ: Solo Leveling" value={title} onChange={(e) => setTitle(e.target.value)} required onFocus={focusBorder} onBlur={blurBorder} />
              </div>
              <div>
                <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Гарчиг (EN)</label>
                <input style={inputStyle} placeholder="English title (optional)" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} onFocus={focusBorder} onBlur={blurBorder} />
              </div>
              <div>
                <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  Slug <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>(/manhua/slug)</span>
                </label>
                <input style={inputStyle} placeholder={autoSlug || "solo-leveling"} value={slug} onChange={(e) => setSlug(e.target.value)} onFocus={focusBorder} onBlur={blurBorder} />
                <p className="mt-1 text-[10px]" style={{ color: "var(--arc-muted)" }}>
                  Үр дүн: <span style={{ color: "var(--arc-dim)" }}>/manhua/{effectiveSlug || "<slug>"}</span>
                </p>
              </div>
              <div>
                <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Статус</label>
                <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} onFocus={focusBorder} onBlur={blurBorder}>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="hiatus">Hiatus</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Тайлбар</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Товч агуулга, гол санаа..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>

            <div>
              <label className="block mb-2 text-[11px]" style={{ color: "var(--arc-muted)" }}>Жанр</label>
              <div className="flex flex-wrap gap-1.5">
                {GENRE_OPTIONS.map((g) => {
                  const active = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenre(g)}
                      className="rounded-full text-[11px] transition-all"
                      style={{
                        padding: "3px 10px",
                        border: active ? "1px solid oklch(0.72 0.17 195/.5)" : "1px solid var(--arc-border)",
                        background: active ? "oklch(0.72 0.17 195/.1)" : "transparent",
                        color: active ? "var(--arc-cyan)" : "var(--arc-dim)",
                        cursor: "pointer",
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              {selectedGenres.length > 0 && (
                <p className="mt-1.5 text-[10px]" style={{ color: "var(--arc-muted)" }}>
                  Сонгосон: <span style={{ color: "var(--arc-dim)" }}>{selectedGenres.join(", ")}</span>
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2" style={{ borderTop: "1px solid var(--arc-border)" }}>
              <button
                type="submit"
                disabled={saving}
                className="rounded-[9px] px-5 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
              >
                {saving ? "Үүсгэж байна..." : "Манхуа үүсгэх"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT – COVER */}
        <div
          className="relative overflow-hidden rounded-[14px] p-5"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          {coverPreview && (
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <img src={coverPreview} alt="Cover bg" className="h-full w-full object-cover" style={{ filter: "blur(40px)", transform: "scale(1.1)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top,var(--arc-card),transparent)" }} />
            </div>
          )}

          <div className="relative z-10 space-y-4">
            <div>
              <div className="text-[13px] font-semibold mb-1" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Cover зураг</div>
              <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>JPG · PNG · WebP</p>
            </div>

            <label
              className="inline-flex cursor-pointer items-center justify-center rounded-[9px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
            >
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {coverFile ? "Файл солих" : "Файл сонгох"}
            </label>

            {coverProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  <span>{uploadingCover ? "Upload хийж байна..." : "Дууслаа"}</span>
                  <span style={{ color: "var(--arc-text)" }}>{coverProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
                  <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${coverProgress}%`, background: "var(--arc-cyan)" }} />
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <div
                className="overflow-hidden"
                style={{ width: 150, aspectRatio: "3/4", borderRadius: 12, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ opacity: 0.2 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l4-4 4 4 4-4 4 4"/><circle cx="8.5" cy="13.5" r="1.5"/></svg>
                  </div>
                )}
              </div>
            </div>

            {coverFile && (
              <p className="text-center text-[11px]" style={{ color: "var(--arc-muted)" }}>
                {coverFile.name}
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
