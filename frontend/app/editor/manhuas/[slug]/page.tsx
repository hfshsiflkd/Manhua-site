/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  editorGetMyManhuas,
  editorUpdateManhua,
  uploadImage,
  Manhua,
  editorGetTeams,
  Team,
} from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

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

// Slugify helper function (matches backend logic)
function slugify(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Star Rating Display Component
function StarRatingDisplay({ rating }: { rating: number }) {
  const clampedRating = Math.min(5, Math.max(0, rating));
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = clampedRating >= star;
        const isHalf = clampedRating >= star - 0.5 && clampedRating < star;
        
        if (isFull) {
          return (
            <span key={star} className="text-amber-400 text-lg">
              ★
            </span>
          );
        } else if (isHalf) {
          return (
            <span key={star} className="text-amber-400/50 text-lg">
              ★
            </span>
          );
        } else {
          return (
            <span key={star} className="text-slate-600 text-lg">
              ★
            </span>
          );
        }
      })}
    </div>
  );
}

// ─────────────────────────────────────
//  Үндсэн page component
// ─────────────────────────────────────
export default function AdminManhuaDetailPage() {
  const { slug: routeSlug } = useParams() as { slug?: string };
  const router = useRouter();

  const [manhua, setManhua] = useState<Manhua | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSlugLocked, setIsSlugLocked] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    coverImage: "",
    status: "ongoing",
    genres: "",
    rating: "",
    teamId: "",
  });
  const [teams, setTeams] = useState<Team[]>([]);

  // ─── LOAD DATA ─────────────────────
  useEffect(() => {
    if (!routeSlug) {
      setLoading(false);
      setError("Manhua slug олдсонгүй.");
      return;
    }

    const fetchManhua = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all my manhuas and find the one with matching slug
        const manhuas = await editorGetMyManhuas();
        const found = manhuas.find(
          (m) => m.slug === routeSlug || m._id === routeSlug
        );

        if (!found) {
          setError("Манхуа олдсонгүй эсвэл та энэ манхуа-д хандах эрхгүй байна.");
          setManhua(null);
          return;
        }

        setManhua(found);

        // Determine if slug was custom (differs from auto-generated)
        const autoSlug = slugify(found.title);
        const wasCustom = Boolean(found.slug && found.slug !== autoSlug);

        setForm({
          title: found.title,
          slug: found.slug || "",
          description: found.description || "",
          coverImage: found.coverImage || (found as any).coverImageUrl || "",
          status: found.status || "ongoing",
          genres: found.genres?.join(", ") || "",
          rating: found.rating?.toString() || "0",
          teamId:
            typeof found.team === "string"
              ? found.team
              : (found.team as any)?._id || "",
        });

        setIsSlugLocked(wasCustom);
      } catch (e: any) {
        console.error("[EditorManhuaDetail] load error:", e);
        setError(
          e?.response?.data?.message || "Манхуа ачаалж чадсангүй"
        );
        setManhua(null);
      } finally {
        setLoading(false);
      }
    };

    fetchManhua();
  }, [routeSlug]);

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

  // ─── SAVE ─────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manhua || !manhua._id) return;

    try {
      setSaving(true);
      setError(null);

      const genresArray = form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      // Parse and validate rating
      const ratingValue = form.rating
        ? Math.min(5, Math.max(0, parseFloat(form.rating) || 0))
        : 0;

      // Normalize and clean slug
      const cleanedSlug = form.slug.trim() 
        ? slugify(form.slug.trim())
        : undefined;
      
      // Update form if slug was cleaned
      if (cleanedSlug && cleanedSlug !== form.slug) {
        setForm((f) => ({ ...f, slug: cleanedSlug }));
      }

      const payload: any = {
        title: form.title,
        slug: cleanedSlug,
        description: form.description || undefined,
        coverImage: form.coverImage || undefined,
        status: form.status,
        genres: genresArray,
        rating: ratingValue,
        teamId: form.teamId || null,
      };

      const updated = await editorUpdateManhua(manhua._id, payload);

      // If slug changed, update route
      if (updated.slug && updated.slug !== routeSlug) {
        router.replace(`/editor/manhuas/${updated.slug}`);
      }

      setManhua(updated);
      toast.success("Манхуа хадгалагдлаа");
    } catch (e: any) {
      console.error("[EditorManhuaDetail] save error:", e);
      
      // Handle uniqueness/conflict errors
      if (e?.response?.status === 409 || 
          e?.response?.data?.message?.toLowerCase().includes("slug") ||
          e?.response?.data?.message?.toLowerCase().includes("unique")) {
        const message = "Slug давхцаж байна. Өөр slug сонгоно уу.";
        setError(message);
        toast.error(message);
      } else {
        const message =
          e?.response?.data?.message || "Манхуа хадгалах үед алдаа гарлаа"
        setError(message);
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── COVER UPLOAD ─────────────────
  const handleCoverFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      setError(null);

      const result = await uploadImage(file);
      const url = (result as any).url;
      setForm((f) => ({ ...f, coverImage: url }));
      toast.success("Cover зураг шинэчлэгдлээ");
    } catch (e: any) {
      console.error("[AdminManhuaDetail] upload error:", e);
      const message =
        e?.response?.data?.message || "Cover зураг upload хийх үед алдаа гарлаа"
      setError(message);
      toast.error(message);
    } finally {
      setUploadingCover(false);
    }
  };

  // ─── DELETE ───────────────────────
  // Note: Editors may not have delete permission, so this might not work
  // If delete is needed, implement editorDeleteManhua endpoint
  const handleDelete = async () => {
    if (!manhua || !manhua._id) return;
    const ok = await confirm({
      title: "Манхуа устгах уу?",
      description: `"${manhua.title}" манхуа-г үнэхээр устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      confirmText: "Устгах",
      cancelText: "Болих",
    });
    if (!ok) return;

    const message =
      "Editor эрхтэй хэрэглэгч манхуа устгах боломжгүй. Админ-тай холбогдоно уу.";
    setError(message);
    toast.error(message);
    setDeleting(false);
  };

  // ─── STATE RENDER ─────────────────
  if (loading && !manhua && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-sm text-slate-400">Манхуа ачаалж байна...</div>
      </div>
    );
  }

  if (error && !manhua) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 mb-1">
            Манхуа удирдах
          </h1>
          <p className="text-sm text-slate-400">Нэг манхуаны дэлгэрэнгүй.</p>
        </div>
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="mb-1">{error}</p>
          <p className="text-slate-300">
            Slug:{" "}
            <span className="font-mono text-xs">{routeSlug ?? "(хоосон)"}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!manhua) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 mb-1">
            Манхуа удирдах
          </h1>
          <p className="text-sm text-slate-400">Нэг манхуаны дэлгэрэнгүй.</p>
        </div>
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          Манхуа олдсонгүй.
        </div>
      </div>
    );
  }

  // ─── DERIVED ──────────────────────
  const coverPreview =
    form.coverImage ||
    manhua.coverImage ||
    (manhua as any).coverImage ||
    "https://via.placeholder.com/450x600?text=No+Cover";

  const publicUrl = `/manhua/${manhua.slug ?? manhua._id}`;

  const createdAt = manhua.createdAt
    ? new Date(manhua.createdAt).toLocaleString()
    : null;
  const updatedAt =
    (manhua as any).updatedAt &&
    new Date((manhua as any).updatedAt).toLocaleString();

  const status = (manhua.status || "ongoing").toLowerCase();
  const statusClass =
    status === "completed"
      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
      : status === "ongoing"
      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
      : "bg-amber-500/20 text-amber-200 border border-amber-500/40";

  // ─── MAIN UI ─
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => router.push("/editor/manhuas")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              ← My Manhuas
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">
            Манхуа удирдах
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Манхуа мэдээлэл, cover, slug, жанр гээд бүх зүйлийг эндээс удирдана.
          </p>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-cyan-500/60 bg-cyan-500/10 px-3 py-2 text-xs sm:text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 transition w-full sm:w-auto"
        >
          <span className="hidden sm:inline">Public page</span>
          <span className="sm:hidden">View</span>
          <span className="ml-1">→</span>
        </a>
      </div>
      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6 pb-20 lg:pb-6">

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Left - Form */}
          <div className="space-y-6">
            {/* Basic Info */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                Үндсэн мэдээлэл
              </h2>
                {error && (
                  <div className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-200">
                    {error}
                  </div>
                )}

              <form onSubmit={handleSave} className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    value={form.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setForm((f) => {
                        const newForm = { ...f, title: newTitle };
                        // Auto-sync slug if not locked
                        if (!isSlugLocked) {
                          newForm.slug = slugify(newTitle);
                        }
                        return newForm;
                      });
                    }}
                    required
                  />
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-medium text-slate-300">
                      Slug
                      <span className="ml-2 text-xs text-slate-500 hidden sm:inline">
                        (/manhua/slug – өөрчлөхдөө болгоомжтой)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSlugLocked(false);
                        setForm((f) => ({ ...f, slug: slugify(f.title) }));
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition self-start sm:self-auto"
                      title={isSlugLocked ? "Slug автоматаар үүсгэх" : "Slug гараар"}
                    >
                      {isSlugLocked ? (
                        <>
                          <span>🔒</span>
                          <span className="hidden sm:inline">Автоматаар</span>
                        </>
                      ) : (
                        <>
                          <span>🔓</span>
                          <span className="hidden sm:inline">Автоматаар</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 font-mono focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    value={form.slug}
                    onChange={(e) => {
                      setIsSlugLocked(true);
                      const inputValue = e.target.value;
                      // Apply slugify on input to keep it clean
                      setForm((f) => ({ ...f, slug: slugify(inputValue) }));
                    }}
                    placeholder={slugify(form.title) || "my-manhua-slug"}
                  />
                  <p className="text-xs text-slate-500 break-all">
                    URL:{" "}
                    <span className="font-mono text-slate-300">
                      /manhua/{form.slug || slugify(form.title) || "<slug>"}
                    </span>
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 resize-none focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Status
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="hiatus">Hiatus</option>
                  </select>
                </div>

                {/* Team */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Баг
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    value={form.teamId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, teamId: e.target.value }))
                    }
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

                {/* Genres - Pill selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Genres (сонгох)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GENRE_OPTIONS.map((g) => {
                      const selectedGenres = form.genres
                        .split(",")
                        .map((genre) => genre.trim())
                        .filter(Boolean);
                      const active = selectedGenres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            const current = form.genres
                              .split(",")
                              .map((genre) => genre.trim())
                              .filter(Boolean);
                            const exists = current.includes(g);
                            const next = exists
                              ? current.filter((genre) => genre !== g)
                              : [...current, g];
                            setForm((f) => ({
                              ...f,
                              genres: next.join(", "),
                            }));
                          }}
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
                  {form.genres
                    .split(",")
                    .map((g) => g.trim())
                    .filter(Boolean).length > 0 && (
                    <p className="text-xs text-slate-500">
                      Сонгосон:{" "}
                      <span className="text-slate-200">
                        {form.genres
                          .split(",")
                          .map((g) => g.trim())
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </p>
                  )}
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Rating / Star (0.0 – 5.0)
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      className="w-full sm:w-24 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      value={form.rating}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setForm((f) => ({ ...f, rating: "" }));
                          return;
                        }
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          const clamped = Math.min(5, Math.max(0, num));
                          setForm((f) => ({ ...f, rating: clamped.toString() }));
                        }
                      }}
                      placeholder="0.0"
                    />
                    <div className="flex items-center gap-3">
                      <StarRatingDisplay
                        rating={form.rating ? parseFloat(form.rating) || 0 : 0}
                      />
                      <span className="text-sm text-slate-400 whitespace-nowrap">
                        {form.rating ? parseFloat(form.rating).toFixed(1) : "0.0"} / 5
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Манхуа-ны үнэлгээ (0.0-5.0 хооронд, 0.1-ийн алхамтай)
                  </p>
                </div>

                <input type="hidden" value={form.coverImage} readOnly />
              </form>
            </section>

            {/* Cover Image Section */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  Cover зураг
                </h2>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 transition w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverFileChange}
                  />
                  {uploadingCover ? "Uploading..." : "Change cover"}
                </label>
              </div>
              <div className="flex justify-center">
                <div className="relative aspect-[3/4] w-full max-w-[192px] sm:w-48 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg">
                  <img
                    src={coverPreview}
                    alt={form.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400 text-center">
                Энэ зургийг манхуагийн нүүр зураг болгон ашиглана.
              </p>
            </section>
          </div>

          {/* Right - Info & Actions */}
          <div className="space-y-6">
            {/* Action Bar - Desktop sticky, hidden on mobile */}
            <div className="hidden lg:block sticky top-6 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 sm:p-6 shadow-xl backdrop-blur-sm">
              <div className="space-y-3">
                <button
                  type="submit"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 transition"
                >
                  {saving ? "Хадгалж байна..." : "Хадгалах"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-60 transition"
                >
                  {deleting ? "Устгаж байна..." : "Устгах"}
                </button>
              </div>
            </div>
            
            {/* Mobile Action Bar - Fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-slate-800 bg-slate-950/95 p-4 shadow-xl backdrop-blur-sm lg:hidden">
              <div className="flex gap-3 max-w-7xl mx-auto">
                <button
                  type="submit"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 transition"
                >
                  {saving ? "Хадгалж байна..." : "Хадгалах"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-60 transition"
                >
                  {deleting ? "Устгах..." : "Устгах"}
                </button>
              </div>
            </div>

            {/* System Info */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                System мэдээлэл
              </h2>
              <div className="space-y-2 font-mono text-xs text-slate-300">
                <p>
                  ID: <span className="text-slate-100">{manhua._id}</span>
                </p>
                {manhua.slug && (
                  <p>
                    Slug: <span className="text-slate-100">{manhua.slug}</span>
                  </p>
                )}
                {createdAt && (
                  <p>
                    Created: <span className="text-slate-200">{createdAt}</span>
                  </p>
                )}
                {updatedAt && (
                  <p>
                    Updated: <span className="text-slate-200">{updatedAt}</span>
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
