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

// Skeleton loader component
function PopularCardSkeleton() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      <div className="relative w-full overflow-hidden rounded-lg aspect-[3/4] bg-slate-800" />
      <div className="mt-2 flex flex-1 flex-col gap-1">
        <div className="h-[2.25rem] md:h-[2.5rem] w-3/4 rounded bg-slate-800" />
        <div className="mt-auto h-3 w-1/2 rounded bg-slate-800" />
        <div className="h-3 w-1/3 rounded bg-slate-800" />
      </div>
    </div>
  );
}

// Format time ago helper
function formatTimeAgo(date?: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    if (diffHours >= 1) return `${diffHours}ц өмнө`;
    if (diffMinutes >= 1) return `${diffMinutes}м өмнө`;
    return "Саяхан";
  }

  if (diffDays === 1) return "1 өдөр өмнө";
  if (diffDays < 7) return `${diffDays} өдөр өмнө`;

  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 долоо хоног өмнө";
  return `${weeks} долоо хоног өмнө`;
}

// Star rating component
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {Array.from({ length: fullStars }).map((_, i) => (
        <span
          key={`full-${i}`}
          className="text-yellow-400 text-[10px] md:text-xs leading-none"
        >
          ★
        </span>
      ))}
      {hasHalfStar && (
        <span className="text-yellow-400 text-[10px] md:text-xs leading-none">
          ½
        </span>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span
          key={`empty-${i}`}
          className="text-gray-600 text-[10px] md:text-xs leading-none"
        >
          ★
        </span>
      ))}
      <span className="ml-0.5 text-[10px] md:text-[11px] text-gray-300 leading-none">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

type PopularTodayProps = {
  popular?: PopularItem[]; // Legacy prop for backward compatibility
};

const PopularToday = ({ popular: legacyPopular }: PopularTodayProps) => {
  const [popular, setPopular] = useState<PopularItem[]>(legacyPopular || []);
  const [loading, setLoading] = useState(!legacyPopular);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have legacy data, don't fetch
    if (legacyPopular && legacyPopular.length > 0) {
      return;
    }

    const fetchPopularToday = async () => {
      try {
        setLoading(true);
        // Fetch 6 items (max needed for desktop)
        const res = await api.get<PopularItem[]>("/manhuas/popular-today", {
          params: { limit: 6 },
        });
        setPopular(res.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch popular today:", err);
        const errorMessage =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message
            : undefined;
        setError(errorMessage || "Алдаа гарлаа");
        // Fallback to empty array
        setPopular([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularToday();
  }, [legacyPopular]);

  return (
    <section className="w-full px-4 py-4 md:py-6 text-white">
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}
        <SectionHeader
          title="Popular Today"
          seeAllHref="/manhuas?sort=today"
          seeAllText="Бүгдийг харах →"
        />

        {/* GRID */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-6 [grid-auto-rows:1fr]">
            {Array.from({ length: 6 }).map((_, i) => (
              <PopularCardSkeleton key={i} />
            ))}
          </div>
        ) : error || popular.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 md:py-10 text-center">
            <p className="text-gray-400 text-base md:text-lg mb-1.5">
              Өнөөдөр trending хараахан алга
            </p>
            <p className="text-gray-500 text-xs md:text-sm">
              Манхуа уншиж эхлэхэд энд харагдах болно
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-6 [grid-auto-rows:1fr]">
            {popular.map((item, index) => {
              // Hide items 4-5 on mobile (show only first 4)
              const isHiddenOnMobile = index >= 4;
              const cover =
                item.coverImageUrl || item.coverImage || "/placeholder.jpg";
              const ratingValue = item.ratingAverage || 0;
              const viewsToday = item.viewsToday || 0;
              const latestChapter = item.latestChapterNumber;

              return (
                <Link
                  key={item._id}
                  href={`/manhua/${item.slug}`}
                  className={`group flex h-full flex-col transition-all duration-200 hover:-translate-y-0.5 ${
                    isHiddenOnMobile ? "hidden lg:flex" : "flex"
                  }`}
                >
                  {/* COVER IMAGE */}
                  <div className="relative w-full overflow-hidden rounded-lg aspect-[3/4] bg-slate-800 shadow-md">
                    <Image
                      src={cover}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 16vw, 14vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      priority={false}
                    />
                    {/* Today views badge */}
                    {viewsToday > 0 && (
                      <div className="absolute top-1.5 right-1.5 rounded-full bg-gradient-to-r from-cyan-500/90 to-fuchsia-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg backdrop-blur-sm">
                        {viewsToday}
                      </div>
                    )}
                  </div>

                  {/* TEXT AREA */}
                  <div className="mt-1.5 flex flex-1 flex-col gap-0.5">
                    {/* TITLE - Fixed height to prevent layout shift */}
                    <h3 className="line-clamp-2 text-[13px] font-medium text-white group-hover:text-cyan-400 transition-colors md:text-sm min-h-[2.25rem] md:min-h-[2.5rem] break-words overflow-hidden">
                      {item.title}
                    </h3>

                    {/* METADATA - Pushed to bottom with mt-auto */}
                    <div className="mt-auto flex flex-col gap-0.5">
                      {/* RATING */}
                      <StarRating rating={ratingValue} />

                      {/* LATEST CHAPTER */}
                      {latestChapter ? (
                        <p
                          className={`text-[11px] md:text-xs truncate ${
                            isChapterRead(item.slug, latestChapter)
                              ? "text-gray-500 font-normal"
                              : "text-gray-400 font-medium"
                          }`}
                        >
                          Ch. {latestChapter}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-500 md:text-xs">
                          No chapters
                        </p>
                      )}

                      {/* LATEST CHAPTER ADDED TIME */}
                      {item.latestChapterAddedAt && (
                        <p className="text-[10px] text-gray-500 md:text-[11px] truncate">
                          {formatTimeAgo(item.latestChapterAddedAt)}
                        </p>
                      )}
                    </div>
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
