/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { editorGetMyManhuas, editorUpdateManhua, editorDeleteManhua, uploadImage, Manhua, editorGetTeams, Team } from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

const GENRE_OPTIONS = ["Romance", "Comedy", "Drama", "Action", "Fantasy", "Slice of Life", "School", "Isekai", "Adventure"];

function slugify(str: string): string {
  return str.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function getSlugBase(title: string, titleEn?: string) {
  return (titleEn && titleEn.trim()) || title;
}

function StarRatingDisplay({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, rating));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="text-lg" style={{ color: r >= star ? "var(--arc-amber)" : r >= star - 0.5 ? "oklch(0.82 0.18 75/.5)" : "var(--arc-border)" }}>★</span>
      ))}
    </div>
  );
}

export default function EditorManhuaDetailPage() {
  const { slug: routeSlug } = useParams() as { slug?: string };
  const router = useRouter();
  const decodedRouteSlug = routeSlug ? decodeURIComponent(routeSlug) : undefined;

  const [manhua, setManhua] = useState<Manhua | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSlugLocked, setIsSlugLocked] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState({ title: "", titleEn: "", slug: "", description: "", coverImage: "", status: "ongoing", genres: "", rating: "", teamId: "" });
  const [teams, setTeams] = useState<Team[]>([]);

  const fieldStyle: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)", borderRadius: 9, padding: "10px 16px", fontSize: 13, outline: "none", width: "100%" };

  useEffect(() => {
    if (!decodedRouteSlug) { setLoading(false); setError("Manhua slug олдсонгүй."); return; }
    const fetch = async () => {
      try {
        setLoading(true); setError(null);
        const manhuas = await editorGetMyManhuas();
        const found = manhuas.find((m) => m.slug === decodedRouteSlug || m._id === decodedRouteSlug);
        if (!found) { setError("Манхуа олдсонгүй эсвэл та энэ манхуа-д хандах эрхгүй байна."); setManhua(null); return; }
        setManhua(found);
        setIsSlugLocked(Boolean(found.slug && found.slug !== slugify(found.title)));
        setForm({
          title: found.title, titleEn: (found as any).titleEn || "", slug: found.slug || "",
          description: found.description || "", coverImage: found.coverImage || (found as any).coverImageUrl || "",
          status: found.status || "ongoing", genres: found.genres?.join(", ") || "",
          rating: found.rating?.toString() || "0",
          teamId: typeof found.team === "string" ? found.team : (found.team as any)?._id || "",
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || "Манхуа ачаалж чадсангүй");
        setManhua(null);
      } finally { setLoading(false); }
    };
    fetch();
  }, [decodedRouteSlug]);

  useEffect(() => {
    let active = true;
    editorGetTeams().then((data) => { if (!active) return; setTeams(Array.isArray(data) ? data : []); })
      .catch(() => { if (!active) return; setTeams([]); });
    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manhua?._id) return;
    try {
      setSaving(true); setError(null);
      const genresArray = form.genres.split(",").map((g) => g.trim()).filter(Boolean);
      const ratingValue = form.rating ? Math.min(5, Math.max(0, parseFloat(form.rating) || 0)) : 0;
      const cleanedSlug = form.slug.trim() ? slugify(form.slug.trim()) : undefined;
      if (cleanedSlug && cleanedSlug !== form.slug) setForm((f) => ({ ...f, slug: cleanedSlug }));
      const updated = await editorUpdateManhua(manhua._id, {
        title: form.title, titleEn: form.titleEn?.trim() || undefined, slug: cleanedSlug,
        description: form.description || undefined, coverImage: form.coverImage || undefined,
        status: form.status, genres: genresArray, teamId: form.teamId || null,
      } as any);
      if (updated.slug && updated.slug !== decodedRouteSlug) router.replace(`/editor/manhuas/${updated.slug}`);
      setManhua(updated);
      toast.success("Манхуа хадгалагдлаа");
    } catch (e: any) {
      const msg = (e?.response?.status === 409 || e?.response?.data?.message?.toLowerCase().includes("slug"))
        ? "Slug давхцаж байна. Өөр slug сонгоно уу."
        : e?.response?.data?.message || "Манхуа хадгалах үед алдаа гарлаа";
      setError(msg); toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true); setError(null); setCoverProgress(0);
      const result = await uploadImage(file, (p) => setCoverProgress(p));
      setForm((f) => ({ ...f, coverImage: (result as any).url }));
      setCoverProgress(100);
      toast.success("Cover зураг шинэчлэгдлээ");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Cover upload алдаа"; setError(msg); toast.error(msg);
    } finally { setUploadingCover(false); }
  };

  const handleDelete = async () => {
    if (!manhua?._id) return;
    const ok = await confirm({
      title: "Манхуа устгах уу?",
      description: `"${manhua.title}" устгахад chapter-ууд хамт сагсанд орно. Админ сэргээх боломжтой.`,
      confirmText: "Устгах",
      cancelText: "Болих",
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await editorDeleteManhua(manhua._id);
      toast.success("Манхуа сагсанд оров");
      router.push("/editor/manhuas");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Устгах үед алдаа гарлаа";
      setError(msg);
      toast.error(msg);
      setDeleting(false);
    }
  };

  const errorDiv = (msg: string) => (
    <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>{msg}</div>
  );

  if (loading && !manhua && !error) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm" style={{ color: "var(--arc-muted)" }}>Манхуа ачаалж байна...</div>;
  }
  if ((error && !manhua) || !manhua) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: "var(--arc-text)" }}>Манхуа удирдах</h1>
        {error ? errorDiv(error) : <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}>Манхуа олдсонгүй.</div>}
      </div>
    );
  }

  const coverPreview = form.coverImage || manhua.coverImage || "https://via.placeholder.com/450x600?text=No+Cover";
  const publicUrl = `/manhua/${manhua.slug ?? manhua._id}`;
  const createdAt = manhua.createdAt ? new Date(manhua.createdAt).toLocaleString() : null;
  const updatedAt = (manhua as any).updatedAt ? new Date((manhua as any).updatedAt).toLocaleString() : null;

  const ActionButtons = ({ full = false }: { full?: boolean }) => (
    <div className={`flex gap-3 ${full ? "" : "flex-col"}`}>
      <button type="submit" onClick={handleSave} disabled={saving}
        className={`${full ? "flex-1" : "w-full"} rounded-[9px] px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60`}
        style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
        {saving ? "Хадгалж байна..." : "Хадгалах"}
      </button>
      <button type="button" onClick={handleDelete} disabled={deleting}
        className={`${full ? "flex-1" : "w-full"} rounded-[9px] px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-60`}
        style={{ border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
        {deleting ? "Устгаж байна..." : "Устгах"}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2">
            <button type="button" onClick={() => router.push("/editor/manhuas")}
              className="rounded-[9px] px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
              ← My Manhuas
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>Манхуа удирдах</h1>
          <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Манхуа мэдээлэл, cover, slug, жанр гээд бүх зүйлийг эндээс удирдана.</p>
        </div>
        <a href={publicUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center justify-center rounded-[9px] px-3 py-2 text-xs sm:text-sm font-medium transition-opacity hover:opacity-80 w-full sm:w-auto"
          style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>
          Public page →
        </a>
      </div>

      {error && errorDiv(error)}

      <div className="space-y-6 pb-20 lg:pb-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          <div className="space-y-6">
            <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Үндсэн мэдээлэл</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Title <span style={{ color: "oklch(0.75 0.2 15)" }}>*</span></label>
                  <input type="text" style={fieldStyle} value={form.title} required onChange={(e) => {
                    const t = e.target.value;
                    setForm((f) => { const nf = { ...f, title: t }; if (!isSlugLocked) nf.slug = slugify(getSlugBase(t, f.titleEn)); return nf; });
                  }} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Title (EN)</label>
                  <input type="text" style={fieldStyle} placeholder="English title (optional)" value={form.titleEn} onChange={(e) => {
                    const te = e.target.value;
                    setForm((f) => { const nf = { ...f, titleEn: te }; if (!isSlugLocked) nf.slug = slugify(getSlugBase(f.title, te)); return nf; });
                  }} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Slug</label>
                    <button type="button" onClick={() => { setIsSlugLocked(false); setForm((f) => ({ ...f, slug: slugify(getSlugBase(f.title, f.titleEn)) })); }}
                      className="self-start rounded-[7px] px-2.5 py-1 text-xs transition-opacity hover:opacity-80"
                      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}>
                      {isSlugLocked ? "🔒 Автоматаар" : "🔓 Автоматаар"}
                    </button>
                  </div>
                  <input type="text" style={{ ...fieldStyle, fontFamily: "monospace" }} value={form.slug}
                    placeholder={slugify(getSlugBase(form.title, form.titleEn)) || "my-manhua-slug"}
                    onChange={(e) => { setIsSlugLocked(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }} />
                  <p className="text-[11px] break-all" style={{ color: "var(--arc-muted)" }}>
                    URL: <span className="font-mono" style={{ color: "var(--arc-dim)" }}>/manhua/{form.slug || slugify(getSlugBase(form.title, form.titleEn)) || "<slug>"}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Description</label>
                  <textarea rows={4} style={{ ...fieldStyle, resize: "none" }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Status</label>
                  <select style={fieldStyle} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="hiatus">Hiatus</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Баг</label>
                  <select style={fieldStyle} value={form.teamId} onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}>
                    <option value="">Баггүй (хувийн)</option>
                    {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRE_OPTIONS.map((g) => {
                      const active = form.genres.split(",").map((x) => x.trim()).filter(Boolean).includes(g);
                      return (
                        <button key={g} type="button"
                          className="rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                          style={active
                            ? { border: "1px solid oklch(0.72 0.17 195/.6)", background: "oklch(0.72 0.17 195/.15)", color: "var(--arc-cyan)" }
                            : { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}
                          onClick={() => {
                            const cur = form.genres.split(",").map((x) => x.trim()).filter(Boolean);
                            const next = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
                            setForm((f) => ({ ...f, genres: next.join(", ") }));
                          }}>
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Rating (0.0 – 5.0)</label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <input type="number" min={0} max={5} step={0.1} style={{ ...fieldStyle, width: undefined }} className="w-full sm:w-24"
                      value={form.rating} placeholder="0.0"
                      onChange={(e) => { const v = e.target.value; if (v === "") { setForm((f) => ({ ...f, rating: "" })); return; } const n = parseFloat(v); if (!isNaN(n)) setForm((f) => ({ ...f, rating: Math.min(5, Math.max(0, n)).toString() })); }} />
                    <div className="flex items-center gap-3">
                      <StarRatingDisplay rating={form.rating ? parseFloat(form.rating) || 0 : 0} />
                      <span className="text-sm whitespace-nowrap" style={{ color: "var(--arc-muted)" }}>{form.rating ? parseFloat(form.rating).toFixed(1) : "0.0"} / 5</span>
                    </div>
                  </div>
                </div>
              </form>
            </section>

            <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Cover зураг</h2>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-[9px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 w-full sm:w-auto"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
                  {uploadingCover ? "Uploading..." : "Change cover"}
                </label>
              </div>
              {coverProgress !== null && (
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--arc-muted)" }}>
                    <span>{uploadingCover ? "Upload хийж байна..." : "Upload"}</span>
                    <span className="font-mono" style={{ color: "var(--arc-text)" }}>{coverProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
                    <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${coverProgress}%`, background: "var(--arc-cyan)" }} />
                  </div>
                </div>
              )}
              <div className="flex justify-center">
                <div className="relative aspect-[3/4] w-full max-w-[192px] sm:w-48 overflow-hidden rounded-[10px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                  <img src={coverPreview} alt={form.title} className="h-full w-full object-cover" />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="hidden lg:block sticky top-6 rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <ActionButtons />
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[14px] p-4 lg:hidden" style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}>
              <div className="max-w-7xl mx-auto"><ActionButtons full /></div>
            </div>

            <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--arc-text)" }}>System мэдээлэл</h2>
              <div className="space-y-2 font-mono text-xs" style={{ color: "var(--arc-dim)" }}>
                <p>ID: <span style={{ color: "var(--arc-text)" }}>{manhua._id}</span></p>
                {manhua.slug && <p>Slug: <span style={{ color: "var(--arc-text)" }}>{manhua.slug}</span></p>}
                {createdAt && <p>Created: <span style={{ color: "var(--arc-text)" }}>{createdAt}</span></p>}
                {updatedAt && <p>Updated: <span style={{ color: "var(--arc-text)" }}>{updatedAt}</span></p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
