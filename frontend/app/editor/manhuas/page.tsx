/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { editorGetMyManhuas, editorUpdateManhua, Manhua } from "@/lib/api";
import EmptyState from "../components/EmptyState";
import { TableSkeleton } from "../components/LoadingSkeleton";

const statusStyle = (status?: string): React.CSSProperties => {
  switch (status) {
    case "ongoing": return { border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" };
    case "completed": return { border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.08)", color: "oklch(0.8 0.14 145)" };
    case "hiatus": return { border: "1px solid oklch(0.82 0.18 75/.4)", background: "oklch(0.82 0.18 75/.08)", color: "var(--arc-amber)" };
    default: return { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" };
  }
};

const prettyStatus = (status?: string) => {
  switch (status) {
    case "ongoing": return "Ongoing";
    case "completed": return "Completed";
    case "hiatus": return "Hiatus";
    default: return "Unknown";
  }
};

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
      setError(e?.response?.data?.message || "Manhuas ачаалж чадсангүй");
      setManhuas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadManhuas(); }, []);

  const handleToggleStatus = async (m: Manhua) => {
    const newStatus = m.status === "completed" ? "ongoing" : m.status === "ongoing" ? "hiatus" : "completed";
    try {
      setTogglingId(m._id);
      await editorUpdateManhua(m._id, { status: newStatus });
      await loadManhuas();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Status солих үед алдаа гарлаа");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredManhuas = manhuas.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.title?.toLowerCase().includes(q) || m.titleEn?.toLowerCase().includes(q) ||
      m.slug?.toLowerCase().includes(q) || m.genres?.some((g) => g.toLowerCase().includes(q));
  });

  const btnBase: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>My Manhuas</h1>
          <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>
            Өөрийн нэмсэн манхуа-гаа жагсааж, статус, chapters болон public page-ээ удирдана.
          </p>
        </div>
        <Link
          href="/editor/manhuas/new"
          className="inline-flex items-center justify-center rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-opacity hover:opacity-80 whitespace-nowrap w-full sm:w-auto"
          style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}
        >
          + New Manhua
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Хайх (title, slug, genre)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[9px] px-4 py-2.5 pl-10 text-sm outline-none"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--arc-muted)" }}>🔍</span>
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="rounded-[9px] px-4 py-2.5 text-sm transition-opacity hover:opacity-80"
            style={btnBase}
          >
            Цэвэрлэх
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : filteredManhuas.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Хайлтын үр дүн олдсонгүй" : "Одоогоор манхуа алга"}
          description={searchQuery ? "Өөр түлхүүр үгээр хайж үзнэ үү." : "Эхний манхуа-аа үүсгэж эхлээрэй."}
          action={!searchQuery ? { label: "+ Эхний манхуа үүсгэх", href: "/editor/manhuas/new" } : undefined}
          icon={searchQuery ? "🔍" : "📚"}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[12px]">
                <thead style={{ background: "var(--arc-elevated)", borderBottom: "1px solid var(--arc-border)" }}>
                  <tr>
                    {["Manhua", "Status", "Updated", "Genres", "Actions"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide${i === 4 ? " text-right" : " text-left"}`} style={{ color: "var(--arc-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredManhuas.map((m) => {
                    const updated = (m as any).updatedAt || (m as any).createdAt;
                    const updatedStr = updated ? new Date(updated).toLocaleDateString() : "-";
                    const publicUrl = `/manhua/${m.slug ?? m._id}`;
                    const chaptersUrl = m.slug ? `/editor/manhuas/${m.slug}/chapters` : undefined;
                    const editUrl = m.slug ? `/editor/manhuas/${m.slug}` : undefined;

                    return (
                      <tr key={m._id} style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-[8px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                              {m.coverImage || (m as any).coverImageUrl ? (
                                <img src={m.coverImage || (m as any).coverImageUrl} alt={m.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center" style={{ color: "var(--arc-muted)" }}>📚</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--arc-text)" }}>{m.title}</p>
                              {m.titleEn && <p className="text-[10px] truncate" style={{ color: "var(--arc-muted)" }}>{m.titleEn}</p>}
                              <p className="text-[10px] mt-0.5 truncate font-mono" style={{ color: "var(--arc-muted)" }}>
                                {m.slug ? `/manhua/${m.slug}` : `ID: ${m._id.slice(0, 8)}…`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex rounded-full px-2.5 py-1 text-[10px]" style={statusStyle(m.status)}>
                            {prettyStatus(m.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-[11px]" style={{ color: "var(--arc-muted)" }}>{updatedStr}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {m.genres && m.genres.length > 0 ? (
                              <>
                                {m.genres.slice(0, 2).map((g, i) => (
                                  <span key={i} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--arc-elevated)", color: "var(--arc-muted)", border: "1px solid var(--arc-border)" }}>{g}</span>
                                ))}
                                {m.genres.length > 2 && <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>+{m.genres.length - 2}</span>}
                              </>
                            ) : <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={publicUrl} target="_blank" className="rounded-full px-2.5 py-1 text-[10px] transition-opacity hover:opacity-80" style={btnBase}>View</Link>
                            {editUrl && <Link href={editUrl} className="rounded-full px-2.5 py-1 text-[10px] transition-opacity hover:opacity-80" style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>Edit</Link>}
                            {chaptersUrl ? (
                              <Link href={chaptersUrl} className="rounded-full px-2.5 py-1 text-[10px] transition-opacity hover:opacity-80" style={{ border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.08)", color: "oklch(0.8 0.14 145)" }}>Chapters</Link>
                            ) : (
                              <button disabled className="rounded-full px-2.5 py-1 text-[10px] opacity-40 cursor-not-allowed" style={btnBase}>No slug</button>
                            )}
                            <button
                              onClick={() => handleToggleStatus(m)}
                              disabled={togglingId === m._id}
                              className="rounded-full px-2.5 py-1 text-[10px] transition-opacity hover:opacity-80 disabled:opacity-50"
                              style={{ border: "1px solid oklch(0.72 0.18 310/.4)", background: "oklch(0.72 0.18 310/.08)", color: "oklch(0.8 0.16 310)" }}
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
          <div className="lg:hidden space-y-3">
            {filteredManhuas.map((m) => {
              const updated = (m as any).updatedAt || (m as any).createdAt;
              const updatedStr = updated ? new Date(updated).toLocaleDateString() : "-";
              const publicUrl = `/manhua/${m.slug ?? m._id}`;
              const chaptersUrl = m.slug ? `/editor/manhuas/${m.slug}/chapters` : undefined;
              const editUrl = m.slug ? `/editor/manhuas/${m.slug}` : undefined;

              return (
                <div key={m._id} className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                  <div className="flex gap-3 mb-3">
                    <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-[8px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                      {m.coverImage || (m as any).coverImageUrl ? (
                        <img src={m.coverImage || (m as any).coverImageUrl} alt={m.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center" style={{ color: "var(--arc-muted)" }}>📚</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate mb-1" style={{ color: "var(--arc-text)" }}>{m.title}</h3>
                      {m.titleEn && <p className="text-xs truncate mb-1" style={{ color: "var(--arc-muted)" }}>{m.titleEn}</p>}
                      <p className="text-[10px] mb-2 truncate font-mono" style={{ color: "var(--arc-muted)" }}>
                        {m.slug ? `/manhua/${m.slug}` : `ID: ${m._id.slice(0, 8)}…`}
                      </p>
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px]" style={statusStyle(m.status)}>{prettyStatus(m.status)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mb-3" style={{ color: "var(--arc-muted)" }}>
                    <span>Updated: {updatedStr}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={publicUrl} target="_blank" className="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 text-center" style={btnBase}>View</Link>
                    {editUrl && <Link href={editUrl} className="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 text-center" style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>Edit</Link>}
                    {chaptersUrl ? (
                      <Link href={chaptersUrl} className="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 text-center" style={{ border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.08)", color: "oklch(0.8 0.14 145)" }}>Chapters</Link>
                    ) : (
                      <button disabled className="flex-1 rounded-full px-3 py-1.5 text-xs opacity-40 cursor-not-allowed text-center" style={btnBase}>No slug</button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(m)}
                      disabled={togglingId === m._id}
                      className="rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ border: "1px solid oklch(0.72 0.18 310/.4)", background: "oklch(0.72 0.18 310/.08)", color: "oklch(0.8 0.16 310)" }}
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

      {!loading && manhuas.length > 0 && (
        <div className="rounded-[9px] px-4 py-3 text-[11px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}>
          Нийт <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{manhuas.length}</span> манхуа
          {searchQuery && <> (хайлтын үр дүн: <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{filteredManhuas.length}</span>)</>}
        </div>
      )}
    </div>
  );
}
