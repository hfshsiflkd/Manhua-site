/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { editorGetMyManhuas, editorUpdateManhua, Manhua } from "@/lib/api";
import EmptyState from "../components/EmptyState";
import { TableSkeleton } from "../components/LoadingSkeleton";

export default function EditorManhuasPage() {
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadManhuas() {
    try {
      setLoading(true);
      const data = await editorGetMyManhuas();
      setManhuas(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error("[EditorManhuas] load error:", e);
      setError(e?.response?.data?.message || "Manhuas ачаалж чадсангүй");
      setManhuas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManhuas();
  }, []);

  const handleToggleStatus = async (m: Manhua) => {
    const newStatus =
      m.status === "completed"
        ? "ongoing"
        : m.status === "ongoing"
        ? "hiatus"
        : "completed";

    try {
      setTogglingId(m._id);
      await editorUpdateManhua(m._id, { status: newStatus });
      await loadManhuas();
    } catch (e: any) {
      console.error("[EditorManhuas] toggle status error:", e);
      setError(e?.response?.data?.message || "Status солих үед алдаа гарлаа");
    } finally {
      setTogglingId(null);
    }
  };

  const prettyStatus = (status?: string) => {
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
  };

  const statusClasses = (status?: string) => {
    switch (status) {
      case "ongoing":
        return "bg-emerald-500/12 text-emerald-200 border border-emerald-500/40";
      case "completed":
        return "bg-sky-500/12 text-sky-200 border border-sky-500/40";
      case "hiatus":
        return "bg-amber-500/12 text-amber-200 border border-amber-500/40";
      default:
        return "bg-slate-700/70 text-slate-200 border border-slate-600/70";
    }
  };

  // Filter manhuas by search query
  const filteredManhuas = manhuas.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.title?.toLowerCase().includes(query) ||
      m.slug?.toLowerCase().includes(query) ||
      m.genres?.some((g) => g.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">My Manhuas</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Өөрийн нэмсэн манхуа-гаа жагсааж, статус, chapters болон public page-ээ удирдана.
          </p>
        </div>
        <Link
          href="/editor/manhuas/new"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 transition whitespace-nowrap w-full sm:w-auto"
        >
          + New Manhua
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Хайх (title, slug, genre)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2.5 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            🔍
          </span>
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Цэвэрлэх
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <TableSkeleton />
      ) : filteredManhuas.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Хайлтын үр дүн олдсонгүй" : "Одоогоор манхуа алга"}
          description={
            searchQuery
              ? "Өөр түлхүүр үгээр хайж үзнэ үү."
              : "Эхний манхуа-аа үүсгэж эхлээрэй."
          }
          action={
            !searchQuery
              ? {
                  label: "+ Эхний манхуа үүсгэх",
                  href: "/editor/manhuas/new",
                }
              : undefined
          }
          icon={searchQuery ? "🔍" : "📚"}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/40">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Manhua
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Genres
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                  {filteredManhuas.map((m) => {
                  const updated =
                    (m as any).updatedAt || (m as any).createdAt;
                  const updatedStr = updated
                    ? new Date(updated).toLocaleDateString("mn-MN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "-";

                  const publicUrl = `/manhua/${m.slug ?? m._id}`;
                  const editorChaptersUrl = m.slug
                    ? `/editor/manhuas/${m.slug}/chapters`
                    : undefined;
                  const editorEditUrl = m.slug
                    ? `/editor/manhuas/${m.slug}`
                    : undefined;

                  return (
                    <tr
                      key={m._id}
                      className="hover:bg-slate-900/80 transition-colors"
                    >
                      {/* Manhua Info */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {/* Cover Thumbnail */}
                          <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                            {m.coverImage || (m as any).coverImageUrl ? (
                              <img
                                src={m.coverImage || (m as any).coverImageUrl}
                                alt={m.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-600">
                                📚
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-100 truncate">
                              {m.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {m.slug ? (
                                <>
                                  <span className="font-mono">/manhua/{m.slug}</span>
                                </>
                              ) : (
                                <span className="font-mono text-slate-600">
                                  ID: {m._id.slice(0, 8)}…
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${statusClasses(
                            m.status
                          )}`}
                        >
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                          {prettyStatus(m.status)}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-4 text-xs text-slate-400">
                        {updatedStr}
                      </td>

                      {/* Genres */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {m.genres && m.genres.length > 0 ? (
                            m.genres.slice(0, 2).map((genre, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300"
                              >
                                {genre}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                          {m.genres && m.genres.length > 2 && (
                            <span className="text-xs text-slate-500">
                              +{m.genres.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={publicUrl}
                            target="_blank"
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-800 transition"
                          >
                            View
                          </Link>
                          {editorEditUrl && (
                            <Link
                              href={editorEditUrl}
                              className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-200 hover:bg-cyan-500/20 transition"
                            >
                              Edit
                            </Link>
                          )}
                          {editorChaptersUrl ? (
                            <Link
                              href={editorChaptersUrl}
                              className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20 transition"
                            >
                              Chapters
                            </Link>
                          ) : (
                            <button
                              disabled
                              className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[10px] text-slate-600 cursor-not-allowed"
                            >
                              No slug
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(m)}
                            disabled={togglingId === m._id}
                            className="rounded-lg border border-purple-500/60 bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-200 hover:bg-purple-500/20 disabled:opacity-60 transition"
                          >
                            {togglingId === m._id ? "..." : "Cycle"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredManhuas.map((m) => {
              const updated =
                (m as any).updatedAt || (m as any).createdAt;
              const updatedStr = updated
                ? new Date(updated).toLocaleDateString("mn-MN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "-";

              const publicUrl = `/manhua/${m.slug ?? m._id}`;
              const editorChaptersUrl = m.slug
                ? `/editor/manhuas/${m.slug}/chapters`
                : undefined;
              const editorEditUrl = m.slug
                ? `/editor/manhuas/${m.slug}`
                : undefined;

              return (
                <div
                  key={m._id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40"
                >
                  <div className="flex gap-3 mb-3">
                    <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                      {m.coverImage || (m as any).coverImageUrl ? (
                        <img
                          src={m.coverImage || (m as any).coverImageUrl}
                          alt={m.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          📚
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-100 truncate mb-1">
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2 truncate">
                        {m.slug ? (
                          <span className="font-mono">/manhua/{m.slug}</span>
                        ) : (
                          <span className="font-mono text-slate-600">
                            ID: {m._id.slice(0, 8)}…
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses(
                            m.status
                          )}`}
                        >
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                          {prettyStatus(m.status)}
                        </span>
                        {m.genres && m.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {m.genres.slice(0, 2).map((genre, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300"
                              >
                                {genre}
                              </span>
                            ))}
                            {m.genres.length > 2 && (
                              <span className="text-[9px] text-slate-500">
                                +{m.genres.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>Updated: {updatedStr}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={publicUrl}
                      target="_blank"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition text-center"
                    >
                      View
                    </Link>
                    {editorEditUrl && (
                      <Link
                        href={editorEditUrl}
                        className="flex-1 rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition text-center"
                      >
                        Edit
                      </Link>
                    )}
                    {editorChaptersUrl ? (
                      <Link
                        href={editorChaptersUrl}
                        className="flex-1 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 transition text-center"
                      >
                        Chapters
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-600 cursor-not-allowed"
                      >
                        No slug
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(m)}
                      disabled={togglingId === m._id}
                      className="rounded-lg border border-purple-500/60 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-500/20 disabled:opacity-60 transition"
                    >
                      {togglingId === m._id ? "..." : "Cycle"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Stats */}
      {!loading && manhuas.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-400">
          Нийт <span className="font-semibold text-slate-200">{manhuas.length}</span> манхуа
          {searchQuery && (
            <>
              {" "}
              (хайлтын үр дүн:{" "}
              <span className="font-semibold text-slate-200">
                {filteredManhuas.length}
              </span>
              )
            </>
          )}
        </div>
      )}
    </div>
  );
}
