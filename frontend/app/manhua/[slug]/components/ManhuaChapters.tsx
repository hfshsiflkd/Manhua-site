// src/components/manhua/ManhuaChapters.tsx
"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { Manhua, Chapter } from "@/types/manhua";
import { isChapterRead } from "@/lib/useReadState";
import { CommentSection } from "./CommentSection";

const CH_PER_PAGE = 15;

type Tab = "chapters" | "comments" | "info";

type ManhuaChaptersProps = {
  slug: string;
  chapters: Chapter[];
  manhua: Manhua;
};

function getTimeAgo(dateStr?: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "Soon";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ц`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 өдөр";
  if (days < 7) return `${days} өдөр`;
  if (days < 30) return `${Math.floor(days / 7)} дол.`;
  return `${Math.floor(days / 30)} сар`;
}

function isNew(dateStr?: string | null) {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 3 * 24 * 60 * 60 * 1000;
}

function StarRow({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} width="14" height="14" viewBox="0 0 20 20" fill={s <= filled ? "oklch(0.82 0.16 85)" : "rgba(255,255,255,.1)"}><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" /></svg>
      ))}
    </div>
  );
}

export function ManhuaChapters({ slug, chapters, manhua }: ManhuaChaptersProps) {
  const [tab, setTab] = useState<Tab>("chapters");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);

  const sortedChapters = useMemo(() => (
    [...chapters].sort((a, b) =>
      sortOrder === "desc" ? b.chapterNumber - a.chapterNumber : a.chapterNumber - b.chapterNumber
    )
  ), [chapters, sortOrder]);

  const totalPages = Math.ceil(sortedChapters.length / CH_PER_PAGE);
  const visibleChapters = sortedChapters.slice((page - 1) * CH_PER_PAGE, page * CH_PER_PAGE);

  const handleTabChange = (t: Tab) => { setTab(t); setPage(1); };

  const TABS: { key: Tab; label: string }[] = [
    { key: "chapters", label: "Chapters" },
    { key: "comments", label: "Сэтгэгдэл" },
    { key: "info", label: "Дэлгэрэнгүй" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px] px-3 items-start">
      {/* LEFT: Tabs + content */}
      <div className="space-y-4 min-w-0">
        {/* Tab bar */}
        <div className="flex gap-1 rounded-[10px] p-1 w-fit" style={{ background: "var(--arc-card)", border: "1px solid var(--arc-border)" }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className="rounded-[7px] px-4 py-1.5 text-[12px] font-semibold transition-all"
              style={{
                background: tab === key ? "var(--arc-cyan-dim, oklch(0.72 0.17 195/.1))" : "transparent",
                color: tab === key ? "var(--arc-cyan)" : "var(--arc-muted)",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CHAPTERS TAB */}
        {tab === "chapters" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px var(--arc-cyan-glow)" }} />
                <span className="text-[14px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Chapters</span>
                {chapters.length > 0 && (
                  <span className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{chapters.length} total</span>
                )}
              </div>
              <button
                onClick={() => { setSortOrder(sortOrder === "desc" ? "asc" : "desc"); setPage(1); }}
                className="rounded-[9px] px-3 py-1.5 text-[11px] transition-colors"
                style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)", cursor: "pointer" }}
              >
                {sortOrder === "desc" ? "Newest ↓" : "Oldest ↑"}
              </button>
            </div>

            {sortedChapters.length === 0 ? (
              <div
                className="rounded-[10px] px-4 py-6 text-center text-[13px]"
                style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-muted)" }}
              >
                Одоогоор chapter нэмэгдээгүй байна.
              </div>
            ) : (
              <>
                <div className="overflow-hidden" style={{ borderRadius: "var(--arc-radius-lg, 14px)", border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                  <ul>
                    {visibleChapters.map((ch, idx) => {
                      const timeAgo = getTimeAgo((ch.releaseAt || ch.createdAt || ch.updatedAt) ?? undefined);
                      const read = isChapterRead(slug, ch.chapterNumber);
                      const isLast = idx === visibleChapters.length - 1;
                      const chIsNew = isNew((ch.releaseAt || ch.createdAt) ?? null);

                      return (
                        <li key={ch._id} style={!isLast ? { borderBottom: "1px solid var(--arc-border)" } : {}}>
                          <Link
                            href={`/manhua/${slug}/chapter/${ch.chapterNumber}`}
                            prefetch={false}
                            className="flex items-center justify-between px-4 py-3 transition-colors"
                            style={{ textDecoration: "none" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="shrink-0 rounded text-[11px] font-semibold px-2 py-0.5"
                                style={{
                                  fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
                                  background: read ? "rgba(255,255,255,.04)" : "var(--arc-cyan-dim, oklch(0.72 0.17 195/.1))",
                                  color: read ? "var(--arc-muted)" : "var(--arc-cyan)",
                                }}
                              >
                                Ch. {ch.chapterNumber}
                              </span>
                              <span
                                className="line-clamp-1 text-[13px] transition-colors"
                                style={{ color: read ? "var(--arc-muted)" : "var(--arc-dim)" }}
                              >
                                {ch.title || `Chapter ${ch.chapterNumber}`}
                              </span>
                              {chIsNew && (
                                <span
                                  className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                  style={{ background: "var(--arc-rose)", color: "#fff" }}
                                >
                                  NEW
                                </span>
                              )}
                            </div>
                            {timeAgo && (
                              <span className="shrink-0 text-[11px] ml-2" style={{ color: "var(--arc-muted)" }}>{timeAgo}</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded-[9px] px-3 py-1.5 text-[11px] transition-colors disabled:opacity-30"
                      style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)", cursor: page > 1 ? "pointer" : "default" }}
                    >
                      ←
                    </button>
                    <span className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{page} / {totalPages}</span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-[9px] px-3 py-1.5 text-[11px] transition-colors disabled:opacity-30"
                      style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)", cursor: page < totalPages ? "pointer" : "default" }}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* COMMENTS TAB */}
        {tab === "comments" && (
          <CommentSection manhuaId={manhua._id} />
        )}

        {/* INFO TAB */}
        {tab === "info" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px var(--arc-cyan-glow)" }} />
              <span className="text-[14px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Дэлгэрэнгүй</span>
            </div>
            <div className="rounded-[14px] overflow-hidden" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              {[
                ["Нэр", manhua.title],
                ...(manhua.titleEn ? [["Англи нэр", manhua.titleEn]] : []),
                ["Статус", manhua.status],
                ...(manhua.author ? [["Автор", manhua.author]] : []),
                ...(manhua.artist ? [["Уран зурагч", manhua.artist]] : []),
                ["Нийт chapter", String(chapters.length)],
                ...(manhua.views != null ? [["Үзэлт", manhua.views.toLocaleString()]] : []),
              ].map(([label, value], idx, arr) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3 text-[13px]"
                  style={idx < arr.length - 1 ? { borderBottom: "1px solid var(--arc-border)" } : {}}
                >
                  <span style={{ color: "var(--arc-muted)" }}>{label}</span>
                  <span className="font-medium" style={{ color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Sidebar */}
      <div className="hidden lg:flex flex-col gap-4">
        {/* Rating card */}
        {typeof manhua.ratingAverage === "number" && (
          <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[3px] h-[13px] rounded-sm" style={{ background: "var(--arc-cyan)" }} />
              <span className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Үнэлгээ</span>
            </div>
            <div className="text-center py-2">
              <div className="text-[44px] font-bold leading-none" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff" }}>
                {manhua.ratingAverage.toFixed(1)}
              </div>
              <div className="flex justify-center my-2">
                <StarRow value={manhua.ratingAverage} />
              </div>
              <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>/ 5 дүгнэлт</div>
            </div>
          </div>
        )}

        {/* Details card */}
        <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[3px] h-[13px] rounded-sm" style={{ background: "var(--arc-cyan)" }} />
            <span className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Мэдээлэл</span>
          </div>
          <div className="space-y-2.5">
            {[
              ["Статус", manhua.status],
              ["Chapter", String(chapters.length)],
              ...(manhua.views != null ? [["Үзэлт", manhua.views.toLocaleString()]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-[12px]">
                <span style={{ color: "var(--arc-muted)" }}>{label}</span>
                <span className="font-medium" style={{ color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Genres / Tags card */}
        {manhua.genres && manhua.genres.length > 0 && (
          <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[3px] h-[13px] rounded-sm" style={{ background: "var(--arc-cyan)" }} />
              <span className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Жанр / Таг</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {manhua.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full px-2.5 py-1 text-[11px] transition-colors"
                  style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)", cursor: "default" }}
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
