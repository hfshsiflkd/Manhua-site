"use client";

import { useEffect, useState } from "react";
import { Chapter } from "./ChapterPages";
import SmallSpinner from "./SmallSpinner";

export default function ChapterHeader({
  slug,
  chapter,
  onBack,
  onPrev,
  onNext,
  isLoading,
  loadedCount,
  totalPages,
}: {
  slug: string;
  chapter: Chapter | null;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isLoading?: boolean;
  loadedCount?: number;
  totalPages?: number;
}) {
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) { setScrollPct(0); return; }
      setScrollPct(Math.min(100, Math.round((el.scrollTop / total) * 100)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasPrev = chapter?.hasPrev ?? false;
  const hasNext = chapter?.hasNext ?? false;

  return (
    <>
      {/* Sticky topbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 gap-2"
        style={{
          height: 52,
          borderBottom: "1px solid var(--arc-border)",
          background: "rgba(7,7,14,0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-[9px] shrink-0 transition-colors"
            style={{ width: 32, height: 32, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-cyan)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="min-w-0">
            <p className="text-[10px] truncate" style={{ color: "var(--arc-muted)" }}>{slug}</p>
            {chapter ? (
              <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>
                Ch. {chapter.chapterNumber}{chapter.title ? ` — ${chapter.title}` : ""}
              </p>
            ) : (
              <p className="text-[13px] font-semibold" style={{ color: "var(--arc-dim)" }}>Loading...</p>
            )}
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 shrink-0">
              <SmallSpinner />
              {loadedCount !== undefined && totalPages !== undefined && totalPages > 0 && (
                <span className="text-[10px] font-mono" style={{ color: "var(--arc-muted)" }}>{loadedCount}/{totalPages}</span>
              )}
            </div>
          )}
        </div>

        {/* Right: prev / next */}
        {chapter && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[11px] font-medium transition-all disabled:opacity-30"
              style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: hasPrev ? "pointer" : "default" }}
              onMouseEnter={(e) => { if (hasPrev) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-cyan)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              <span className="hidden sm:inline">Өмнөх</span>
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[11px] font-medium transition-all disabled:opacity-30"
              style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: hasNext ? "pointer" : "default" }}
              onMouseEnter={(e) => { if (hasNext) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-cyan)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; }}
            >
              <span className="hidden sm:inline">Дараах</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}
      </header>

      {/* 2px cyan progress bar fixed below header */}
      <div className="fixed left-0 right-0 z-50" style={{ top: 52, height: 2, background: "var(--arc-elevated)" }}>
        <div
          className="h-full transition-[width] duration-150"
          style={{ width: `${scrollPct}%`, background: "var(--arc-cyan)", boxShadow: "0 0 8px oklch(0.72 0.17 195/.5)" }}
        />
      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: 54 }} />
    </>
  );
}
