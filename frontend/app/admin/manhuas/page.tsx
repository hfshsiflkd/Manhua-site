/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../components/AdminShell";
import { adminGetManhuas, Manhua } from "@/lib/api";

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ongoing:   { background: "oklch(0.72 0.17 195/.1)", color: "var(--arc-cyan)",        border: "1px solid oklch(0.72 0.17 195/.3)" },
  completed: { background: "oklch(0.72 0.17 155/.1)", color: "oklch(0.8 0.14 155)",    border: "1px solid oklch(0.72 0.17 155/.3)" },
  hiatus:    { background: "oklch(0.82 0.16 85/.1)",  color: "var(--arc-amber)",        border: "1px solid oklch(0.82 0.16 85/.3)"  },
};
const STATUS_LABEL: Record<string, string> = { ongoing: "Ongoing", completed: "Completed", hiatus: "Hiatus" };

const actBtn: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 6,
  border: "1px solid var(--arc-border)", background: "transparent",
  color: "var(--arc-dim)", fontSize: 10, cursor: "pointer",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  transition: "color .12s, border-color .12s",
  textDecoration: "none", display: "inline-block",
};

export default function AdminManhuasPage() {
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminGetManhuas()
      .then((data) => { if (active) { setManhuas(Array.isArray(data) ? data : []); setError(null); } })
      .catch((e: any) => { if (active) setError(e?.response?.data?.message || "Manhuas ачаалж чадсангүй"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <AdminShell title="Manhuas" subtitle="Бүх манхуа — нэмэх, засах, chapter удирдах.">
      <div className="space-y-4">

        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
            Нийт{" "}
            <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{manhuas.length}</span> манхуа
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="manhuas/new"
              className="rounded-[8px] px-3 py-1.5 text-[11px] font-semibold transition-all hover:brightness-110"
              style={{ background: "oklch(0.72 0.17 195)", color: "#07070e", textDecoration: "none" }}
            >
              + Шинэ манхуа
            </Link>
            <Link
              href="/editor/manhuas"
              className="rounded-[8px] px-3 py-1.5 text-[11px] font-medium"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", textDecoration: "none" }}
            >
              Editor panel →
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[9px] px-3 py-2 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-[10px]" style={{ background: "var(--arc-elevated)" }} />
            ))}
          </div>
        )}

        {/* Table */}
        {!loading && manhuas.length === 0 && !error && (
          <div className="py-12 text-center text-[13px]" style={{ color: "var(--arc-muted)" }}>
            Одоогоор manhua бүртгэгдээгүй байна.
          </div>
        )}

        {!loading && manhuas.length > 0 && (
          <div className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "rgba(0,0,0,.2)", borderBottom: "1px solid var(--arc-border)" }}>
                  <tr>
                    {["Манхуа", "Статус", "Жанр", "Chapters", "Огноо", ""].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "9px 16px", textAlign: i === 5 ? "right" : "left",
                          fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                          textTransform: "uppercase", color: "var(--arc-muted)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manhuas.map((m) => {
                    const status = (m.status || "unknown").toLowerCase();
                    const ss = STATUS_STYLE[status] || { background: "var(--arc-elevated)", color: "var(--arc-dim)", border: "1px solid var(--arc-border)" };
                    const cover = (m as any).coverImageUrl || (m as any).coverImage;
                    const genres: string[] = Array.isArray(m.genres) ? m.genres.slice(0, 3) : [];
                    return (
                      <tr
                        key={m._id}
                        style={{ borderTop: "1px solid var(--arc-border)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.02)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                      >
                        {/* Cover + title */}
                        <td style={{ padding: "10px 16px" }}>
                          <div className="flex items-center gap-3">
                            <div
                              className="shrink-0 overflow-hidden"
                              style={{ width: 36, height: 48, borderRadius: 6, background: "var(--arc-elevated)", flexShrink: 0 }}
                            >
                              {cover ? (
                                <img src={cover} alt={m.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center" style={{ opacity: 0.3 }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[12px] truncate" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)", maxWidth: 200 }}>
                                {m.title}
                              </div>
                              {m.slug && (
                                <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--arc-muted)", maxWidth: 200 }}>
                                  /{m.slug}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ ...ss, display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                            {STATUS_LABEL[status] || status}
                          </span>
                        </td>

                        {/* Genres */}
                        <td style={{ padding: "10px 16px" }}>
                          <div className="flex flex-wrap gap-1">
                            {genres.length > 0 ? genres.map((g) => (
                              <span key={g} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, background: "rgba(255,255,255,.06)", color: "var(--arc-dim)" }}>
                                {g}
                              </span>
                            )) : <span style={{ fontSize: 11, color: "var(--arc-muted)" }}>—</span>}
                            {(m.genres?.length || 0) > 3 && (
                              <span style={{ fontSize: 9, color: "var(--arc-muted)" }}>+{(m.genres?.length || 0) - 3}</span>
                            )}
                          </div>
                        </td>

                        {/* Chapters */}
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontWeight: 600, fontSize: 12, color: "var(--arc-text)" }}>
                            {(m as any).chapterCount ?? (m as any).chaptersCount ?? "—"}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ padding: "10px 16px", fontSize: 11, color: "var(--arc-muted)" }}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString("mn-MN") : "—"}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "10px 16px" }}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/manhua/${m.slug ?? m._id}`}
                              style={actBtn}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; }}
                            >
                              Харах
                            </Link>
                            <Link
                              href={`manhuas/${m._id}/chapters`}
                              style={{ ...actBtn, borderColor: "oklch(0.72 0.17 195/.3)", color: "var(--arc-cyan)", background: "oklch(0.72 0.17 195/.08)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 195/.15)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 195/.08)"; }}
                            >
                              Ch+
                            </Link>
                            <Link
                              href={`manhuas/${m._id}`}
                              style={actBtn}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; }}
                            >
                              Засах
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
