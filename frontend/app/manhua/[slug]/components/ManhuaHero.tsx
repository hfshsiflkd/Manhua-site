// src/components/manhua/ManhuaHero.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { Manhua, Chapter } from "@/types/manhua";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { useAuth } from "@/context/AuthContext";

type ManhuaHeroProps = { manhua: Manhua; chapters: Chapter[] };

function getTimeAgo(d?: string | number | Date | null) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const ms = Date.now() - date.getTime();
  if (ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Саяхан";
  if (mins < 60) return `${mins}м өмнө`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ц өмнө`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} өдөр өмнө`;
  return date.toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ongoing:   { background: "oklch(0.72 0.17 155/.12)", color: "oklch(0.8 0.14 155)",  border: "1px solid oklch(0.72 0.17 155/.25)" },
  completed: { background: "oklch(0.72 0.17 195/.12)", color: "var(--arc-cyan)",       border: "1px solid oklch(0.72 0.17 195/.25)" },
  hiatus:    { background: "oklch(0.82 0.16 85/.12)",  color: "var(--arc-amber)",      border: "1px solid oklch(0.82 0.16 85/.25)" },
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ManhuaHero({ manhua, chapters }: ManhuaHeroProps) {
  const { user } = useAuth();
  const manhuaId = (manhua as { _id?: string })._id || null;
  const fav = useFavorites(manhuaId);
  const bm = useBookmarks(manhuaId);

  const coverSrc = manhua.coverImage || "";
  const totalChapters = chapters.length;
  const latestCh = totalChapters > 0 ? chapters[0] : null;
  const firstCh = totalChapters > 0 ? chapters[totalChapters - 1] : null;
  const lastUpdate = getTimeAgo(manhua.latestChapterAt);
  const status = (manhua.status || "ongoing").toLowerCase();
  const statusStyle = STATUS_STYLE[status] || STATUS_STYLE.ongoing;
  const rating = manhua.ratingAverage || manhua.rating || 0;

  const favStyle: React.CSSProperties = {
    border: `1px solid ${fav.isFavorited ? "oklch(0.65 0.22 15/.5)" : "var(--arc-border)"}`,
    background: fav.isFavorited ? "oklch(0.65 0.22 15/.08)" : "var(--arc-elevated)",
    color: fav.isFavorited ? "var(--arc-rose)" : "var(--arc-dim)",
    cursor: "pointer",
  };
  const bmStyle: React.CSSProperties = {
    border: `1px solid ${bm.isBookmarked ? "oklch(0.82 0.16 85/.4)" : "var(--arc-border)"}`,
    background: bm.isBookmarked ? "oklch(0.82 0.16 85/.08)" : "var(--arc-elevated)",
    color: bm.isBookmarked ? "var(--arc-amber)" : "var(--arc-dim)",
    cursor: "pointer",
  };

  const CoverActions = () => user ? (
    <div className="flex gap-2 mt-2.5">
      <button onClick={async () => { try { await fav.toggle(); } catch {} }} disabled={fav.isLoading}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] py-2 text-[11px] font-medium transition-all"
        style={favStyle}>
        <HeartIcon filled={fav.isFavorited} />
        <span>{fav.isFavorited ? "Saved" : "Дуртай"}</span>
      </button>
      <button onClick={async () => { try { await bm.toggle(); } catch {} }} disabled={bm.isLoading}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] py-2 text-[11px] font-medium transition-all"
        style={bmStyle}>
        <BookmarkIcon filled={bm.isBookmarked} />
        <span>{bm.isBookmarked ? "Saved" : "Хадгалах"}</span>
      </button>
    </div>
  ) : null;

  const CTAButtons = () => latestCh ? (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/manhua/${manhua.slug}/chapter/${latestCh.chapterNumber}`}
        className="flex items-center gap-2 rounded-[9px] px-4 py-2.5 text-[12px] font-bold transition-all hover:brightness-110"
        style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", background: "var(--arc-cyan)", color: "#07070e", boxShadow: "0 0 20px var(--arc-cyan-glow)" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        Read Latest – Ch. {latestCh.chapterNumber}
      </Link>
      {firstCh && firstCh.chapterNumber !== latestCh.chapterNumber && (
        <Link
          href={`/manhua/${manhua.slug}/chapter/${firstCh.chapterNumber}`}
          className="rounded-[9px] px-4 py-2.5 text-[12px] font-medium transition-colors"
          style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; }}
        >
          Ch. {firstCh.chapterNumber}-с эхлэх
        </Link>
      )}
    </div>
  ) : null;

  return (
    <section className="relative md:rounded-[14px]"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      {/* Blurred bg */}
      <div className="overflow-hidden pointer-events-none absolute inset-0 md:rounded-[14px]">
        {coverSrc && (
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `url(${coverSrc})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(40px)", transform: "scale(1.1)" }} />
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg,rgba(7,7,14,.97) 0%,rgba(7,7,14,.88) 60%,rgba(7,7,14,.7) 100%)" }} />
      </div>

      <div className="relative z-10 p-4 sm:p-6">

        {/* ── MOBILE LAYOUT (< sm) ───────────────────── */}
        <div className="flex flex-col gap-4 sm:hidden">
          {/* Row: small cover + quick info */}
          <div className="flex gap-3">
            <div className="shrink-0 overflow-hidden rounded-[10px]"
              style={{ width: 90, aspectRatio: "2/3", border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", boxShadow: "0 6px 24px rgba(0,0,0,.5)" }}>
              {coverSrc && <img src={coverSrc} alt={manhua.title} className="h-full w-full object-cover" />}
            </div>
            <div className="flex flex-col gap-2 min-w-0 justify-start pt-0.5">
              <h1 className="text-[18px] font-bold leading-tight"
                style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff", letterSpacing: "-0.02em" }}>
                {manhua.title}
              </h1>
              <span className="self-start rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={statusStyle}>
                {manhua.status}
              </span>
              <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                {rating > 0 && (
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="oklch(0.82 0.16 85)"><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" /></svg>
                    <b style={{ color: "var(--arc-text)" }}>{rating.toFixed(1)}</b>
                  </span>
                )}
                {totalChapters > 0 && <span>{totalChapters} ch</span>}
                {manhua.views != null && <span>{(manhua.views / 1000).toFixed(0)}k views</span>}
              </div>
              {manhua.genres && manhua.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {manhua.genres.slice(0, 3).map((g) => (
                    <span key={g} className="rounded-full px-2 py-0.5 text-[10px]"
                      style={{ background: "rgba(255,255,255,.05)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}>
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {manhua.description && (
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--arc-dim)" }}>
              {manhua.description}
            </p>
          )}

          {/* Author */}
          {(manhua.author || manhua.artist) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>
              {manhua.author && <span>Автор: <b style={{ color: "var(--arc-dim)" }}>{manhua.author}</b></span>}
              {manhua.artist && <span>Уран зурагч: <b style={{ color: "var(--arc-dim)" }}>{manhua.artist}</b></span>}
            </div>
          )}

          {/* CTA */}
          <CTAButtons />

          {/* Fav / Bm */}
          <CoverActions />
        </div>

        {/* ── DESKTOP LAYOUT (≥ sm) ─────────────────── */}
        <div className="hidden sm:grid gap-6" style={{ gridTemplateColumns: "160px 1fr" }}>
          {/* Cover column */}
          <div className="flex flex-col">
            <div className="overflow-hidden rounded-[10px]"
              style={{ width: "100%", aspectRatio: "2/3", border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
              {coverSrc && <img src={coverSrc} alt={manhua.title} className="h-full w-full object-cover" />}
            </div>
            <CoverActions />
          </div>

          {/* Info column */}
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight flex-1 min-w-[160px]"
                style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff", letterSpacing: "-0.025em" }}>
                {manhua.title}
              </h1>
              <span className="rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider self-start mt-1 shrink-0" style={statusStyle}>
                {manhua.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--arc-dim)" }}>
              {rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="oklch(0.82 0.16 85)"><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" /></svg>
                  <b style={{ color: "var(--arc-text)" }}>{rating.toFixed(1)}</b>
                  <span style={{ color: "var(--arc-muted)" }}>/ 5</span>
                </span>
              )}
              {manhua.views != null && (
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  <b style={{ color: "var(--arc-text)" }}>{manhua.views.toLocaleString()}</b>
                </span>
              )}
              {totalChapters > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  <b style={{ color: "var(--arc-text)" }}>{totalChapters}</b>
                  <span style={{ color: "var(--arc-muted)" }}>chapters</span>
                </span>
              )}
              {lastUpdate && <span style={{ color: "var(--arc-muted)" }}>Сүүлд: <span style={{ color: "var(--arc-dim)" }}>{lastUpdate}</span></span>}
            </div>

            {manhua.genres && manhua.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {manhua.genres.map((g) => (
                  <span key={g} className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: "rgba(255,255,255,.06)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}>
                    {g}
                  </span>
                ))}
              </div>
            )}

            {manhua.description && (
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--arc-dim)", maxWidth: 600 }}>
                {manhua.description}
              </p>
            )}

            {(manhua.author || manhua.artist) && (
              <div className="grid gap-1.5 text-[12px] sm:grid-cols-2" style={{ maxWidth: 360 }}>
                {manhua.author && <p style={{ color: "var(--arc-muted)" }}>Автор: <b style={{ color: "var(--arc-text)" }}>{manhua.author}</b></p>}
                {manhua.artist && <p style={{ color: "var(--arc-muted)" }}>Уран зурагч: <b style={{ color: "var(--arc-text)" }}>{manhua.artist}</b></p>}
              </div>
            )}

            <CTAButtons />
          </div>
        </div>

      </div>
    </section>
  );
}
