/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/manhuas/[slug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import {
  adminGetManhua,
  adminUpdateManhua,
  adminDeleteManhua,
  uploadImage,
  Manhua,
} from "@/lib/api";

// ─────────────────────────────────────
//  Туслах жижиг components
// ─────────────────────────────────────
function PanelShell({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-3.5 text-xs text-slate-300 shadow-md shadow-black/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] text-slate-400">{children}</label>;
}

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { small?: boolean }
) {
  const { small, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={
        "w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 " +
        (small ? "py-1 text-[11px]" : "py-1.5 text-xs") +
        " text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60 " +
        (className || "")
      }
    />
  );
}

function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }
) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={
        "w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60 " +
        (className || "")
      }
    />
  );
}

// ─────────────────────────────────────
//  Үндсэн page component
// ─────────────────────────────────────
export default function AdminManhuaDetailPage() {
  const { slug } = useParams() as { slug?: string };
  const manhuaId = slug as string | undefined;
  const router = useRouter();

  const [manhua, setManhua] = useState<Manhua | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    coverImage: "",
    status: "ongoing",
    genres: "",
  });

  // ─── LOAD DATA ─────────────────────
  useEffect(() => {
    if (!manhuaId) {
      setLoading(false);
      setError("Manhua ID олдсонгүй.");
      return;
    }

    const fetchManhua = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminGetManhua(manhuaId);
        setManhua(data);

        setForm({
          title: data.title,
          slug: data.slug || "",
          description: data.description || "",
          coverImage: data.coverImage || data.coverImageUrl || "",
          status: data.status || "ongoing",
          genres: data.genres?.join(", ") || "",
        });
      } catch (e: any) {
        console.error("[AdminManhuaDetail] load error:", e);
        setError(
          e?.response?.data?.message || "Манхуа ачаалж чадсангүй (admin view)"
        );
        setManhua(null);
      } finally {
        setLoading(false);
      }
    };

    fetchManhua();
  }, [manhuaId]);

  // ─── SAVE ─────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manhuaId || !manhua) return;

    try {
      setSaving(true);
      setError(null);

      const genresArray = form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      const updated = await adminUpdateManhua(manhuaId, {
        title: form.title,
        slug: form.slug || undefined,
        description: form.description || undefined,
        coverImage: form.coverImage || undefined,
        status: form.status,
        genres: genresArray,
      });

      setManhua(updated);
    } catch (e: any) {
      console.error("[AdminManhuaDetail] save error:", e);
      setError(
        e?.response?.data?.message || "Манхуа хадгалах үед алдаа гарлаа"
      );
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
    } catch (e: any) {
      console.error("[AdminManhuaDetail] upload error:", e);
      setError(
        e?.response?.data?.message || "Cover зураг upload хийх үед алдаа гарлаа"
      );
    } finally {
      setUploadingCover(false);
    }
  };

  // ─── DELETE ───────────────────────
  const handleDelete = async () => {
    if (!manhuaId || !manhua) return;
    const ok = window.confirm(
      `"${manhua.title}" манхуа-г үнэхээр устгах уу? Энэ үйлдлийг буцаах боломжгүй.`
    );
    if (!ok) return;

    try {
      setDeleting(true);
      setError(null);
      await adminDeleteManhua(manhuaId);
      router.push("/admin/manhuas");
    } catch (e: any) {
      console.error("[AdminManhuaDetail] delete error:", e);
      setError(e?.response?.data?.message || "Манхуа устгах үед алдаа гарлаа");
      setDeleting(false);
    }
  };

  // ─── STATE RENDER ─────────────────
  if (loading && !manhua && !error) {
    return (
      <AdminShell title="Manhua manage" subtitle="Манхуа ачаалж байна...">
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
          Loading...
        </div>
      </AdminShell>
    );
  }

  if (error && !manhua) {
    return (
      <AdminShell title="Manhua manage" subtitle="Нэг манхуаны дэлгэрэнгүй.">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="mb-1">{error}</p>
          <p className="text-slate-300">
            ID:{" "}
            <span className="font-mono text-xs">{manhuaId ?? "(хоосон)"}</span>
          </p>
        </div>
      </AdminShell>
    );
  }

  if (!manhua) {
    return (
      <AdminShell title="Manhua manage" subtitle="Нэг манхуаны дэлгэрэнгүй.">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          Манхуа олдсонгүй.
        </div>
      </AdminShell>
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

  // ─── MAIN UI (cover as background) ─
  return (
    <AdminShell
      title="Manhua manage"
      subtitle="Манхуа мэдээлэл, cover, slug, жанр, эзэн гээд бүх зүйлийг эндээс удирдана."
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-2xl shadow-black/60">
        {/* BACKGROUND – cover зураг blur-тай */}
        <div className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverPreview}
            alt={manhua.title}
            className="h-full w-full object-cover blur-2xl scale-110 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/92 to-slate-950/98" />
        </div>

        {/* FOREGROUND CONTENT */}
        <div className="relative z-10 p-4 sm:p-5 space-y-5">
          {/* TOP BAR */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <div className="relative h-16 w-12 overflow-hidden rounded-md bg-slate-900/80 shadow shadow-black/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt={manhua.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <h1 className="text-sm font-semibold text-slate-50 sm:text-base">
                  {manhua.title}
                </h1>
                {manhua.slug && (
                  <p className="text-[11px] text-slate-400">
                    /manhua/
                    <span className="font-mono text-slate-200">
                      {manhua.slug}
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                  >
                    {manhua.status || "ongoing"}
                  </span>
                  {manhua.genres && manhua.genres.length > 0 && (
                    <span className="line-clamp-1 text-[11px] text-slate-300">
                      {manhua.genres.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 text-[11px] text-slate-400 md:items-end">
              <div className="flex flex-wrap gap-2">
                {createdAt && (
                  <span>
                    Created: <span className="text-slate-100">{createdAt}</span>
                  </span>
                )}
                {updatedAt && (
                  <span>
                    Updated: <span className="text-slate-100">{updatedAt}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/admin/manhuas")}
                  className="rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-900"
                >
                  ← Back
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-cyan-500/90 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-cyan-400"
                >
                  Open public page
                </a>
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)]">
            {/* LEFT – Cover + form */}
            <div className="space-y-3">
              {/* Cover change – зөвхөн товч, URL харагдэхгүй */}
              <PanelShell
                title="Cover image"
                right={
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverFileChange}
                    />
                    {uploadingCover ? "Uploading..." : "Change cover"}
                  </label>
                }
              >
                <div className="flex gap-3">
                  <div className="relative aspect-[3/4] w-24 overflow-hidden rounded-lg bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreview}
                      alt={form.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Энэ зургийг манхуагийн нүүр зураг болгон ашиглана.{" "}
                    <span className="text-slate-200">Change cover</span> дарж
                    шинэ файл сонгож upload хийнэ.
                  </p>
                </div>
              </PanelShell>

              {/* Edit form */}
              <PanelShell title="Basic info">
                {error && (
                  <div className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-3">
                  {/* Title */}
                  <div className="space-y-1">
                    <Label>
                      Title<span className="text-red-400"> *</span>
                    </Label>
                    <TextInput
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      required
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-1">
                    <Label>
                      Slug
                      <span className="ml-1 text-[10px] text-slate-500">
                        (/manhua/slug – өөрчлөхдөө болгоомжтой)
                      </span>
                    </Label>
                    <TextInput
                      value={form.slug}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, slug: e.target.value }))
                      }
                      placeholder="my-manhua-slug"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <TextArea
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>

                  {/* Status + Genres */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <select
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
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
                    <div className="space-y-1">
                      <Label>Genres (comma separated)</Label>
                      <TextInput
                        value={form.genres}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, genres: e.target.value }))
                        }
                        placeholder="Romance, Comedy, Fantasy..."
                      />
                    </div>
                  </div>

                  {/* hidden cover url */}
                  <input type="hidden" value={form.coverImage} readOnly />

                  {/* Buttons */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-500/20 transition disabled:opacity-60"
                    >
                      {deleting ? "Устгаж байна..." : "Устгах"}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow shadow-emerald-500/40 disabled:opacity-60"
                    >
                      {saving ? "Хадгалж байна..." : "Хадгалах"}
                    </button>
                  </div>
                </form>
              </PanelShell>
            </div>

            {/* RIGHT – Owner + System */}
            <div className="space-y-3">
              <PanelShell
                title="Owner"
                right={
                  manhua.createdBy && (
                    <span className="inline-flex rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] text-slate-200">
                      {(manhua.createdBy as any).role ?? "user"}
                    </span>
                  )
                }
              >
                {manhua.createdBy ? (
                  <div className="space-y-1">
                    <p>
                      Username:{" "}
                      <span className="font-medium">
                        {manhua.createdBy.username}
                      </span>
                    </p>
                    {(manhua.createdBy as any).email && (
                      <p className="text-slate-400">
                        {(manhua.createdBy as any).email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Owner мэдээлэл байхгүй.
                  </p>
                )}
              </PanelShell>

              <PanelShell title="System info">
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <p>
                    ID: <span className="text-slate-100">{manhua._id}</span>
                  </p>
                  {manhua.slug && (
                    <p>
                      Slug:{" "}
                      <span className="text-slate-100">{manhua.slug}</span>
                    </p>
                  )}
                  {createdAt && (
                    <p>
                      Created:{" "}
                      <span className="text-slate-200">{createdAt}</span>
                    </p>
                  )}
                  {updatedAt && (
                    <p>
                      Updated:{" "}
                      <span className="text-slate-200">{updatedAt}</span>
                    </p>
                  )}
                </div>
              </PanelShell>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
