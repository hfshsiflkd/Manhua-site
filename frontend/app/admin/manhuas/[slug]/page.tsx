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
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

import { ManhuaTopBar } from "./components/ManhuaTopBar";
import { CoverImagePanel } from "./components/CoverImagePanel";
import {
  BasicInfoPanel,
  type ManhuaFormState,
} from "./components/BasicInfoPanel";
import { OwnerPanel } from "./components/OwnerPanel";
import { SystemInfoPanel } from "./components/SystemInfoPanel";

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
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState<ManhuaFormState>({
    title: "",
    slug: "",
    description: "",
    coverImage: "",
    status: "ongoing",
    genres: "",
    rating: "",
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
          coverImage: data.coverImage || (data as any).coverImageUrl || "",
          status: data.status || "ongoing",
          genres: data.genres?.join(", ") || "",
          rating: data.rating?.toString() || "0",
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
        rating: form.rating ? parseFloat(form.rating) : 0,
      });

      setManhua(updated);
      toast.success("Манхуа мэдээлэл хадгалагдлаа");
    } catch (e: any) {
      console.error("[AdminManhuaDetail] save error:", e);
      const message =
        e?.response?.data?.message || "Манхуа хадгалах үед алдаа гарлаа"
      setError(message);
      toast.error(message);
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
  const handleDelete = async () => {
    if (!manhuaId || !manhua) return;
    const ok = await confirm({
      title: "Манхуа устгах уу?",
      description: `"${manhua.title}" манхуа-г үнэхээр устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      confirmText: "Устгах",
      cancelText: "Болих",
    });
    if (!ok) return;

    try {
      setDeleting(true);
      setError(null);
      await adminDeleteManhua(manhuaId);
      toast.success("Манхуа устгагдлаа");
      router.push("/admin/manhuas");
    } catch (e: any) {
      console.error("[AdminManhuaDetail] delete error:", e);
      const message =
        e?.response?.data?.message || "Манхуа устгах үед алдаа гарлаа";
      setError(message);
      toast.error(message);
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

  // ─── MAIN UI ──────────────────────
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
            className="h-full w-full scale-110 object-cover blur-2xl opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/92 to-slate-950/98" />
        </div>

        {/* FOREGROUND CONTENT */}
        <div className="relative z-10 space-y-5 p-4 sm:p-5">
          <ManhuaTopBar
            manhua={manhua}
            coverPreview={coverPreview}
            statusClass={statusClass}
            createdAt={createdAt}
            updatedAt={updatedAt}
            publicUrl={publicUrl}
            onBack={() => router.push("/admin/manhuas")}
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)]">
            {/* LEFT – Cover + form */}
            <div className="space-y-3">
              <CoverImagePanel
                coverPreview={coverPreview}
                title={form.title || manhua.title}
                uploadingCover={uploadingCover}
                onChangeCover={handleCoverFileChange}
              />

              <BasicInfoPanel
                form={form}
                setForm={setForm}
                error={error}
                saving={saving}
                deleting={deleting}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            </div>

            {/* RIGHT – Owner + System */}
            <div className="space-y-3">
              <OwnerPanel manhua={manhua} />
              <SystemInfoPanel
                manhua={manhua}
                createdAt={createdAt}
                updatedAt={updatedAt}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
