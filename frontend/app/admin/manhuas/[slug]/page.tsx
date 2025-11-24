/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/manhuas/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import {
  adminGetManhua,
  adminUpdateManhua,
  adminDeleteManhua,
  Manhua,
} from "@/lib/api";

export default function AdminManhuaDetailPage() {
  const params = useParams() as { id?: string; slug?: string };
  const router = useRouter();

  // 🔥 энд аль нь байгааг нь ашиглана: id || slug
  const manhuaId = (params.id || params.slug) as string | undefined;

  const [manhua, setManhua] = useState<Manhua | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    coverImage: "",
    status: "ongoing",
    genres: "",
  });

  useEffect(() => {
    if (!manhuaId) {
      // параметр ирэхгүй бол ачаалал false болгочихъё
      setLoading(false);
      setError("ID / slug олдсонгүй.");
      return;
    }

    const fetchManhua = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("[AdminManhuaDetail] params =", params);
        console.log("[AdminManhuaDetail] manhuaId =", manhuaId);

        const data = await adminGetManhua(manhuaId);
        console.log("[AdminManhuaDetail] loaded =", data);

        setManhua(data);
        setForm({
          title: data.title,
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
  }, [manhuaId, params]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manhua) return;

    try {
      setSaving(true);
      setError(null);

      const genresArray = form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      const updated = await adminUpdateManhua(manhua._id, {
        title: form.title,
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

  const handleDelete = async () => {
    if (!manhua) return;
    const ok = window.confirm(
      `"${manhua.title}" манхуа-г үнэхээр устгах уу? Энэ үйлдлийг буцаах боломжгүй.`
    );
    if (!ok) return;

    try {
      setDeleting(true);
      setError(null);
      await adminDeleteManhua(manhua._id);
      router.push("/admin/manhuas");
    } catch (e: any) {
      console.error("[AdminManhuaDetail] delete error:", e);
      setError(e?.response?.data?.message || "Манхуа устгах үед алдаа гарлаа");
      setDeleting(false);
    }
  };

  // ---------- RENDER ----------

  if (loading && !manhua && !error) {
    return (
      <AdminShell
        title="Manhua manage"
        subtitle="Нэг манхуа дээр дэлгэрэнгүй тохиргоо."
      >
        <div className="text-sm text-slate-400">Манхуа ачаалж байна...</div>
      </AdminShell>
    );
  }

  if (error && !manhua) {
    return (
      <AdminShell title="Manhua manage" subtitle="Нэг манхуаны дэлгэрэнгүй.">
        <div className="space-y-2 text-sm">
          <p className="text-red-400">{error}</p>
          <p className="text-slate-500">
            ID / slug:{" "}
            <span className="font-mono text-xs">{manhuaId ?? "(хоосон)"}</span>
          </p>
        </div>
      </AdminShell>
    );
  }

  if (!manhua) {
    return (
      <AdminShell title="Manhua manage" subtitle="Нэг манхуаны дэлгэрэнгүй.">
        <div className="text-sm text-red-400">
          Манхуа олдсонгүй. ID / slug:{" "}
          <span className="font-mono text-xs text-slate-300">
            {manhuaId ?? "(хоосон)"}
          </span>
        </div>
      </AdminShell>
    );
  }

  const coverPreview =
    form.coverImage ||
    manhua.coverImageUrl ||
    (manhua as any).coverImage ||
    "https://via.placeholder.com/300x400?text=No+Cover";

  return (
    <AdminShell
      title={`Manage: ${manhua.title}`}
      subtitle="Нэг манхуа дээр дэлгэрэнгүй тохиргоо, эзэн, статусыг удирдана."
    >
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        {/* Үндсэн form */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">
                Title<span className="text-red-400">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Description</label>
              <textarea
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Cover Image URL</label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                value={form.coverImage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, coverImage: e.target.value }))
                }
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Status</label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
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
                <label className="text-xs text-slate-400">
                  Genres (comma separated)
                </label>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                  value={form.genres}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, genres: e.target.value }))
                  }
                  placeholder="Romance, Comedy, Fantasy..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push("/admin/manhuas")}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Буцах
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/20 transition disabled:opacity-60"
                >
                  {deleting ? "Устгаж байна..." : "Устгах"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow shadow-emerald-500/40 disabled:opacity-60"
                >
                  {saving ? "Хадгалж байна..." : "Хадгалах"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Баруун тал – owner + preview */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
            <h3 className="mb-2 text-sm font-semibold text-slate-100">
              Owner info
            </h3>
            {manhua.createdBy ? (
              <div className="space-y-1">
                <p>
                  Username:{" "}
                  <span className="font-medium">
                    {manhua.createdBy.username}
                  </span>
                </p>
                {"email" in manhua.createdBy && (
                  <p className="text-slate-400">
                    {(manhua.createdBy as any).email}
                  </p>
                )}
                {"role" in manhua.createdBy && (
                  <p>
                    Role:{" "}
                    <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">
                      {(manhua.createdBy as any).role}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-500">Owner мэдээлэл байхгүй.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
            <h3 className="mb-2 text-sm font-semibold text-slate-100">
              Cover preview
            </h3>
            <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt={form.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
