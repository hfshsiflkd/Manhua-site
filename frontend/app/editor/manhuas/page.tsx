// frontend/src/app/editor/manhuas/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  editorGetMyManhuas,
  editorCreateManhua,
  editorUpdateManhua,
  Manhua,
} from "@/lib/api";

export default function EditorManhuasPage() {
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    coverImage: "",
    status: "ongoing",
    genres: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function loadManhuas() {
    try {
      setLoading(true);
      const data = await editorGetMyManhuas();
      setManhuas(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load manhuas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManhuas();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const genresArray = form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      await editorCreateManhua({
        title: form.title,
        description: form.description || undefined,
        coverImage: form.coverImage || undefined,
        status: form.status,
        genres: genresArray.length ? genresArray : undefined,
      });

      setForm({
        title: "",
        description: "",
        coverImage: "",
        status: "ongoing",
        genres: "",
      });
      setCreating(false);
      await loadManhuas();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create manhua");
    }
  };

  const handleToggleStatus = async (m: Manhua) => {
    const newStatus =
      m.status === "completed"
        ? "ongoing"
        : m.status === "ongoing"
        ? "hiatus"
        : "completed";
    try {
      await editorUpdateManhua(m._id, { status: newStatus });
      await loadManhuas();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to update manhua");
    }
  };

  function prettyStatus(status?: string) {
    switch (status) {
      case "ongoing":
        return "Ongoing";
      case "completed":
        return "Completed";
      case "hiatus":
        return "Hiatus";
      default:
        return "Unknown";
    }
  }

  function statusClasses(status?: string) {
    switch (status) {
      case "ongoing":
        return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
      case "completed":
        return "bg-sky-500/15 text-sky-200 border-sky-500/40";
      case "hiatus":
        return "bg-amber-500/15 text-amber-200 border-amber-500/40";
      default:
        return "bg-slate-700 text-slate-200 border-slate-600";
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header – зөвхөн editor-д зориулсан */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Editor Panel – My Manhuas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Өөрийн нэмсэн series дээрээ нэмэлт, засвар хийх хэсэг.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 transition"
        >
          + New manhua
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Manhua grid */}
      {loading ? (
        <div className="text-sm text-slate-400">Loading manhuas...</div>
      ) : manhuas.length === 0 ? (
        <div className="text-sm text-slate-500">
          Одоогоор чи манхуа нэмээгүй байна. Эхнийхээ нэмээрэй!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {manhuas.map((m) => {
            const coverUrl =
              m.coverImageUrl ||
              m.coverImage ||
              "https://via.placeholder.com/400x250?text=No+Cover";

            const created = m.createdAt
              ? new Date(m.createdAt).toLocaleDateString()
              : "-";

            return (
              <div
                key={m._id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur shadow shadow-black/40 overflow-hidden flex flex-col hover:border-cyan-500/50 hover:bg-slate-900 transition"
              >
                {/* Cover */}
                <div className="relative h-44 bg-slate-950 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt={m.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent" />

                  {/* Status pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${statusClasses(
                        m.status
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                      {prettyStatus(m.status)}
                    </span>
                  </div>

                  {/* Title + genres */}
                  <div className="absolute bottom-3 left-3 right-3 space-y-1">
                    <h3 className="text-sm font-semibold text-slate-50 line-clamp-2">
                      {m.title}
                    </h3>
                    {m.genres && m.genres.length > 0 && (
                      <p className="text-[11px] text-slate-300 line-clamp-1">
                        {m.genres.join(" • ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Meta + actions */}
                <div className="p-3 flex flex-col gap-2 text-[11px]">
                  <p className="line-clamp-3 text-slate-300 min-h-[2.8em]">
                    {m.description || (
                      <span className="text-slate-500">
                        No description yet.
                      </span>
                    )}
                  </p>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>Created: {created}</span>
                    {m.slug && (
                      <span className="text-[10px] text-slate-500">
                        /manhua/{m.slug}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20 transition"
                    >
                      Cycle status
                    </button>
                    <span className="text-[10px] text-slate-500">
                      ID: {m._id.slice(0, 6)}…
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create manhua modal */}
      {creating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Create new manhua</h2>
              <button
                onClick={() => setCreating(false)}
                className="text-slate-400 hover:text-slate-100 text-sm"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
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
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">
                  Cover Image URL
                </label>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                  value={form.coverImage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, coverImage: e.target.value }))
                  }
                  placeholder="https://example.com/cover.jpg"
                />
                <p className="text-[10px] text-slate-500">
                  Бүрэн URL оруулаарай (CDN / storage линк).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow shadow-emerald-500/40"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
