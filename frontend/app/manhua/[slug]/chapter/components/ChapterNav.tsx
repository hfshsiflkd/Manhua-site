"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ChapterNavProps = {
  slug: string;
  chapterNumber: number;
  hasPrev: boolean;
  hasNext: boolean;
  totalPages?: number;
};

export function ChapterNav({ slug, chapterNumber, hasPrev, hasNext, totalPages = 0 }: ChapterNavProps) {
  const router = useRouter();
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) { setScrollPct(0); return; }
      setScrollPct(Math.min(100, Math.round((el.scrollTop / total) * 100)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const readPages = totalPages > 0 ? Math.round((scrollPct / 100) * totalPages) : 0;

  const navBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 9,
    border: "1px solid var(--arc-border)", background: "transparent",
    color: "var(--arc-dim)", fontSize: 12, fontWeight: 500,
    cursor: "pointer", transition: "border-color .15s, color .15s",
    fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
  };

  const goPrev = () => {
    if (hasPrev && chapterNumber > 1) router.push(`/manhua/${slug}/chapter/${chapterNumber - 1}`);
    else router.push(`/manhua/${slug}`);
  };

  const goNext = () => {
    if (hasNext) router.push(`/manhua/${slug}/chapter/${chapterNumber + 1}`);
    else router.push(`/manhua/${slug}`);
  };

  const visible = scrollPct >= 90;

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(7,7,14,.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--arc-border)",
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        transition: "transform 0.3s ease, opacity 0.3s ease",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Prev */}
      <button
        onClick={goPrev}
        disabled={!hasPrev && chapterNumber <= 1}
        style={{ ...navBtnStyle, opacity: (!hasPrev && chapterNumber <= 1) ? 0.3 : 1, cursor: (!hasPrev && chapterNumber <= 1) ? "default" : "pointer" }}
        onMouseEnter={(e) => { if (hasPrev || chapterNumber > 1) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border-h, rgba(255,255,255,.13))"; (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; } }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        Ch. {hasPrev && chapterNumber > 1 ? chapterNumber - 1 : "—"}
      </button>

      {/* Center info */}
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--arc-muted)", lineHeight: 1.4 }}>
        <div>
          Ch. <b style={{ color: "var(--arc-text)" }}>{chapterNumber}</b>
          {" · "}
          {scrollPct}% уншсан
        </div>
        {totalPages > 0 && (
          <div style={{ fontSize: 10, marginTop: 2 }}>
            {readPages}/{totalPages} хуудас
          </div>
        )}
      </div>

      {/* Next */}
      <button
        onClick={goNext}
        style={{
          ...navBtnStyle,
          ...(hasNext
            ? { background: "var(--arc-cyan)", color: "#07070e", border: "none", boxShadow: "0 0 16px oklch(0.72 0.17 195/.4)", fontWeight: 700 }
            : { opacity: 0.3, cursor: "default" }),
        }}
        onMouseEnter={(e) => { if (hasNext) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = ""; }}
      >
        Ch. {hasNext ? chapterNumber + 1 : "—"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}
