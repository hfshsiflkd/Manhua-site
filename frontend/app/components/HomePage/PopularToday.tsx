"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SectionHeader } from "./SectionHeader";
import { isChapterRead } from "@/lib/useReadState";

type PopularItem = {
  _id: string;
  title: string;
  slug: string;
  coverImage?: string;
  coverImageUrl?: string;
  ratingAverage?: number;
  viewsToday?: number;
  chaptersCount?: number;
  latestChapterNumber?: number | null;
  latestChapterAddedAt?: string | null;
};

function PopularCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="relative w-full rounded-[10px] aspect-[3/4]" style={{ background: "var(--arc-elevated)" }} />
      <div className="mt-2.5 flex flex-col gap-1.5">
        <div className="h-9 w-3/4 rounded" style={{ background: "var(--arc-elevated)" }} />
        <div className="h-3 w-1/2 rounded" style={{ background: "var(--arc-elevated)" }} />
        <div className="h-3 w-1/3 rounded" style={{ background: "var(--arc-elevated)" }} />
      </div>
    </div>
  );
}

function formatTimeAgo(date?: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 0) {
    if (diffHours >= 1) return `${diffHours}ц өмнө`;
    const mins = Math.floor(diffMs / 60000);
    if (mins >= 1) return `${mins}м өмнө`;
    return "Саяхан";
  }
  if (diffDays === 1) return "1 өдөр өмнө";
  if (diffDays < 7) return `${diffDays} өдөр өмнө`;
  return `${Math.floor(diffDays / 7)} дол. өмнө`;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = Math.max(0, 5 - full - (half ? 1 : 0));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="leading-none" style={{ color: "var(--arc-amber)", fontSize: 10 }}>★</span>
      ))}
      {half && <span className="leading-none" style={{ color: "var(--arc-amber)", fontSize: 10 }}>½</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="leading-none" style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>★</span>
      ))}
      <span className="ml-0.5 leading-none" style={{ fontSize: 10, color: "var(--arc-dim)" }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

type PopularTodayProps = {
  popular?: PopularItem[];
};

const PopularToday = ({ popular: legacyPopular }: PopularTodayProps) => {
  const [popular, setPopular] = useState<PopularItem[]>(legacyPopular || []);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Server-с prop ирсэн бол дахин fetch хийхгүй
    if (legacyPopular && legacyPopular.length > 0) return;
    const doFetch = async () => {
      try {
        setLoading(true);
        const res = await api.get<PopularItem[]>("/manhuas/popular-today", { params: { limit: 6 } });
        setPopular(res.data);
      } catch {
        setPopular([]);
      } finally {
        setLoading(false);
      }
    };
    doFetch();
  }, [legacyPopular]);

  return (
    <section className="w-full px-4 py-6 md:py-8">
      <div className="mx-auto w-full" style={{ maxWidth: "var(--arc-max-w)" }}>
        <SectionHeader title="Popular Today" seeAllHref="/manhuas?sort=today" />

        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <PopularCardSkeleton key={i} />)}
          </div>
        ) : popular.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-base mb-1" style={{ color: "var(--arc-dim)" }}>Өнөөдөр trending алга</p>
            <p className="text-sm" style={{ color: "var(--arc-muted)" }}>Манхуа уншиж эхлэхэд энд харагдах болно</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {popular.map((item, index) => {
              const cover = item.coverImageUrl || item.coverImage || "/placeholder.jpg";
              const rating = item.ratingAverage || 0;
              const views = item.viewsToday || 0;
              const latestCh = item.latestChapterNumber;
              const isTop3 = index < 3;

              return (
                <Link
                  key={item._id}
                  href={`/manhua/${item.slug}`}
                  prefetch={false}
                  className={`group flex flex-col transition-transform duration-200 hover:-translate-y-0.5 ${index >= 4 ? "hidden lg:flex" : "flex"}`}
                >
                  {/* COVER */}
                  <div
                    className="relative w-full overflow-hidden aspect-[3/4]"
                    style={{
                      borderRadius: "var(--arc-radius)",
                      background: "var(--arc-elevated)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    }}
                  >
                    <Image
                      src={cover}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 14vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                      priority={false}
                    />

                    {/* RANK */}
                    <div
                      className="absolute top-2 left-2 text-[20px] font-bold leading-none"
                      style={{
                        fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)",
                        color: isTop3 ? "var(--arc-amber)" : "rgba(255,255,255,0.85)",
                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    {/* VIEWS BADGE */}
                    {views > 0 && (
                      <div
                        className="absolute top-1.5 right-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: "rgba(6,182,212,0.85)", color: "#07070e" }}
                      >
                        {views.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* TEXT */}
                  <div className="mt-2.5 flex flex-col gap-1">
                    <h3
                      className="line-clamp-2 text-[13px] font-semibold leading-snug transition-colors group-hover:text-[var(--arc-cyan)]"
                      style={{
                        fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)",
                        color: "var(--arc-text)",
                        minHeight: "2.25rem",
                      }}
                    >
                      {item.title}
                    </h3>
                    
                    
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularToday;
