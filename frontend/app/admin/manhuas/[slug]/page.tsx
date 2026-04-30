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
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState<ManhuaFormState>({
    title: "",
    titleEn: "",
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
          titleEn: (data as any).titleEn || "",
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
        titleEn: form.titleEn?.trim() || undefined,
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

      setCoverProgress(0);
      const result = await uploadImage(file, (percent) => {
        setCoverProgress(percent);
      });
      const url = (result as any).url;
      setForm((f) => ({ ...f, coverImage: url }));
      setCoverProgress(100);
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
      <AdminShell title="Manhua засах" subtitle="Манхуа ачаалж байна...">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div style={{ position: "relative", width: 44, height: 44 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
              <circle cx="22" cy="22" r="18" stroke="var(--arc-border)" strokeWidth="3" />
              <circle cx="22" cy="22" r="18" stroke="var(--arc-cyan)" strokeWidth="3" strokeLinecap="round" strokeDasharray="28 84" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (error && !manhua) {
    return (
      <AdminShell title="Manhua засах" subtitle="Манхуа мэдээлэл засах.">
        <div className="rounded-[12px] p-4 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          <p className="mb-1">{error}</p>
          <p style={{ color: "var(--arc-muted)" }}>ID: <span className="font-mono">{manhuaId ?? "(хоосон)"}</span></p>
        </div>
      </AdminShell>
    );
  }

  if (!manhua) {
    return (
      <AdminShell title="Manhua засах" subtitle="Манхуа мэдээлэл засах.">
        <div className="rounded-[12px] p-4 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
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

  // ─── MAIN UI ──────────────────────
  return (
    <AdminShell
      title="Manhua засах"
      subtitle="Манхуа мэдээлэл, cover, slug, жанр, эзэн гээд бүх зүйлийг эндээс удирдана."
    >
      <div className="space-y-5">
        <ManhuaTopBar
          manhua={manhua}
          coverPreview={coverPreview}
          statusClass=""
          createdAt={createdAt}
          updatedAt={updatedAt}
          publicUrl={publicUrl}
          onBack={() => router.push("/admin/manhuas")}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)]">
          <div className="space-y-4">
            <CoverImagePanel
              coverPreview={coverPreview}
              title={form.title || manhua.title}
              uploadingCover={uploadingCover}
              coverProgress={coverProgress}
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

          <div className="space-y-4">
            <OwnerPanel manhua={manhua} />
            <SystemInfoPanel
              manhua={manhua}
              createdAt={createdAt}
              updatedAt={updatedAt}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
