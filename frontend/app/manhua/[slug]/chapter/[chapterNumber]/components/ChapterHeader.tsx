"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Chapter } from "./ChapterPages";
import SmallSpinner from "./SmallSpinner";

interface ChapterListItem {
  chapterNumber: number;
  title?: string;
  createdAt?: string;
}

function formatChapterDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 30) {
    if (diffDays === 0) {
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return mins <= 1 ? "Саяхан" : `${mins}м өмнө`;
      return `${Math.floor(mins / 60)}ц өмнө`;
    }
    return `${diffDays} өдөр өмнө`;
  }
  return d.toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function ChapterHeader({
  slug,
  manhuaTitle,
  chapter,
  onBack,
  isLoading,
  loadedCount,
  totalPages,
}: {
  slug: string;
  manhuaTitle?: string;
  chapter: Chapter | null;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isLoading?: boolean;
  loadedCount?: number;
  totalPages?: number;
}) {
  const router = useRouter();
  const [scrollPct, setScrollPct] = useState(0);
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [chapterList, setChapterList] = useState<ChapterListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const y = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;

      if (total > 0) setScrollPct(Math.min(100, Math.round((y / total) * 100)));

      if (y > 80) {
        setVisible(y < lastY.current);
      } else {
        setVisible(true);
      }
      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Animate in after mount
  useEffect(() => {
    if (popupOpen) {
      const raf = requestAnimationFrame(() => setPopupVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [popupOpen]);

  function closePopup() {
    setPopupVisible(false);
    setTimeout(() => setPopupOpen(false), 220);
  }

  // Close popup on outside click
  useEffect(() => {
    if (!popupOpen) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closePopup();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popupOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll active chapter into view when popup opens
  useEffect(() => {
    if (popupOpen && activeRef.current) {
      setTimeout(() => activeRef.current?.scrollIntoView({ block: "center" }), 80);
    }
  }, [popupOpen, chapterList]);

  async function openPopup() {
    setPopupVisible(false);
    setPopupOpen(true);
    if (chapterList.length > 0) return;
    setListLoading(true);
    try {
      const res = await api.get(`/manhuas/${slug}/chapters`);
      const data: ChapterListItem[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.chapters)
        ? res.data.chapters
        : [];
      setChapterList(data.sort((a, b) => a.chapterNumber - b.chapterNumber));
    } catch {
      // ignore
    } finally {
      setListLoading(false);
    }
  }

  const displayTitle =
    manhuaTitle ||
    decodeURIComponent(slug)
      .replace(/-/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <>
      {/* Sticky topbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 gap-2"
        style={{
          height: 52,
          borderBottom: "1px solid var(--arc-border)",
          background: "rgba(7,7,14,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.25s ease",
        }}
      >
        {/* Left: back + titles */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-[9px] shrink-0 transition-colors"
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--arc-border)",
              background: "var(--arc-elevated)",
              color: "var(--arc-dim)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-cyan)";
              (e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)";
              (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          {/* Titles (non-clickable) */}
          <div className="min-w-0 flex-1">
            <p
              className="truncate font-semibold leading-tight"
              style={{
                fontSize: 13,
                color: "var(--arc-text)",
                fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
              }}
            >
              {displayTitle}
            </p>
            {chapter && (
              <p className="truncate leading-tight" style={{ fontSize: 11, color: "var(--arc-muted)" }}>
                Ch. {chapter.chapterNumber}
                {chapter.title ? ` — ${chapter.title}` : ""}
              </p>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center gap-1.5 shrink-0">
              <SmallSpinner />
              {loadedCount !== undefined && totalPages !== undefined && totalPages > 0 && (
                <span className="text-[10px] font-mono" style={{ color: "var(--arc-muted)" }}>
                  {loadedCount}/{totalPages}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: chapter picker button */}
        <button
          onClick={openPopup}
          className="flex items-center gap-1.5 shrink-0 rounded-[9px]"
          style={{
            height: 32,
            padding: "0 10px",
            border: "1px solid var(--arc-border)",
            background: "var(--arc-elevated)",
            color: "var(--arc-dim)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "border-color .15s, color .15s",
            fontFamily: "var(--font-body,'DM Sans',sans-serif)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-cyan)";
            (e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)";
            (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)";
          }}
        >
          {chapter ? `Ch. ${chapter.chapterNumber}` : "Ch."}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </header>

      {/* Chapter picker popup */}
      {popupOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: popupVisible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
            transition: "background 0.2s ease",
          }}
        >
          <div
            ref={popupRef}
            style={{
              position: "absolute",
              top: 58,
              left: 12,
              right: 12,
              maxWidth: 360,
              margin: "0 auto",
              background: "var(--arc-card)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
              opacity: popupVisible ? 1 : 0,
              transform: popupVisible ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.97)",
              transition: "opacity 0.2s ease, transform 0.2s ease",
            }}
          >
            {/* Popup header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--arc-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>
                Бүлгүүд
              </span>
              <button
                onClick={closePopup}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--arc-muted)", padding: 4 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Chapter list */}
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {listLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                  <SmallSpinner />
                </div>
              ) : chapterList.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--arc-muted)" }}>
                  Бүлэг олдсонгүй
                </div>
              ) : (
                chapterList.map((ch) => {
                  const isCurrent = chapter?.chapterNumber === ch.chapterNumber;
                  return (
                    <button
                      key={ch.chapterNumber}
                      ref={isCurrent ? activeRef : undefined}
                      onClick={() => {
                        closePopup();
                        setTimeout(() => router.push(`/manhua/${slug}/chapter/${ch.chapterNumber}`), 150);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 16px",
                        background: isCurrent ? "rgba(255,255,255,0.05)" : "none",
                        border: "none",
                        borderBottom: "1px solid var(--arc-border)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background .12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) (e.currentTarget as HTMLElement).style.background = "none";
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? "var(--arc-cyan)" : "var(--arc-dim)",
                          minWidth: 56,
                        }}
                      >
                        Ch. {ch.chapterNumber}
                      </span>
                      {ch.title ? (
                        <span style={{ fontSize: 12, color: "var(--arc-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ch.title}
                        </span>
                      ) : (
                        <span style={{ flex: 1 }} />
                      )}
                      {(() => {
                        const dateLabel = formatChapterDate(ch.createdAt);
                        return dateLabel ? (
                          <span style={{ fontSize: 10, color: "var(--arc-muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
                            {dateLabel}
                          </span>
                        ) : null;
                      })()}
                      {isCurrent && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "var(--arc-cyan)", flexShrink: 0, marginLeft: 4 }}>
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="fixed left-0 right-0"
        style={{ top: 0, height: 2, background: "var(--arc-elevated)", zIndex: 60 }}
      >
        <div
          className="h-full transition-[width] duration-150"
          style={{
            width: `${scrollPct}%`,
            background: "var(--arc-cyan)",
            boxShadow: "0 0 8px oklch(0.72 0.17 195/.5)",
          }}
        />
      </div>

      {/* Spacer */}
      <div style={{ height: 54 }} />
    </>
  );
}
