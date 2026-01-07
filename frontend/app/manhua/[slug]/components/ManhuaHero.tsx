// src/components/manhua/ManhuaHero.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Manhua, Chapter } from "@/types/manhua";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { useAuth } from "@/context/AuthContext";
import RatingStars from "../../../manhuas/components/RatingStars";

type ManhuaHeroProps = {
  manhua: Manhua;
  chapters: Chapter[];
};

// ⏱️ English time-ago formatter
function getTimeAgoEN(dateLike?: string | number | Date | null) {
  if (!dateLike) return "";

  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0) return "Soon";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export function ManhuaHero({ manhua, chapters }: ManhuaHeroProps) {
  const { user } = useAuth();
  const manhuaId = (manhua as any)._id || null;
  const favorites = useFavorites(manhuaId);
  const bookmarks = useBookmarks(manhuaId);

  const coverSrc =
    (manhua as any).coverImageUrl ||
    manhua.coverImage ||
    "https://via.placeholder.com/450x600?text=No+Cover";

  const rating = Number((manhua as any).ratingAverage ?? (manhua as any).rating ?? 0);
  const hasRating = Number.isFinite(rating) && rating > 0;

  const totalChapters = chapters.length;
  const latestChapter = totalChapters > 0 ? chapters[0] : null;
  const firstChapter = totalChapters > 0 ? chapters[totalChapters - 1] : null;

  const lastUpdateText = getTimeAgoEN(
    manhua.latestChapterAt || manhua.updatedAt
  );

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await favorites.toggle();
    } catch (err) {
      // Error already handled in hook
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await bookmarks.toggle();
    } catch (err) {
      // Error already handled in hook
    }
  };

  return (
    <section className="relative overflow-hidden md:rounded-2xl border border-slate-800 bg-slate-950/90 shadow-xl shadow-black/50">
      {/* Background image (cover) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${coverSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />

      {/* Foreground content */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1.1fr),minmax(0,1.9fr)]">
          {/* LEFT: small cover card */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-28 sm:w-32 md:w-40 lg:w-44">
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/60">
                <img
                  src={coverSrc}
                  alt={manhua.title}
                  className="h-auto w-full max-h-[380px] object-contain"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: info */}
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              {/* Title + status chip + action buttons */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                    {manhua.title}
                  </h1>

                  <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    {manhua.status}
                  </span>

                  {/* Favorite & Bookmark buttons */}
                  {user && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={handleFavoriteClick}
                        disabled={favorites.isLoading}
                        className={`rounded-lg p-1.5 transition-all ${
                          favorites.isFavorited
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                        } ${favorites.isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={
                          favorites.isFavorited
                            ? "Дуртай жагсаалтаас хасах"
                            : "Дуртай жагсаалтад нэмэх"
                        }
                      >
                        {favorites.isFavorited ? "❤️" : "🤍"}
                      </button>
                      <button
                        onClick={handleBookmarkClick}
                        disabled={bookmarks.isLoading}
                        className={`rounded-lg p-1.5 transition-all ${
                          bookmarks.isBookmarked
                            ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                            : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                        } ${bookmarks.isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={
                          bookmarks.isBookmarked
                            ? "Хавтсаас хасах"
                            : "Хавтасанд нэмэх"
                        }
                      >
                        {bookmarks.isBookmarked ? "🔖" : "📑"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Small meta row: rating, chapters, last update */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  {hasRating ? (
                    <span className="flex items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/star.svg"
                        alt=""
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <RatingStars value={rating} size={12} />
                    </span>
                  ) : (
                    <span className="text-slate-500">Үнэлгээ байхгүй</span>
                  )}

                  {totalChapters > 0 && <span>{totalChapters} бүлэг</span>}

                  {manhua.views != null && (
                    <span>{manhua.views.toLocaleString()} үзэлт</span>
                  )}

                  {lastUpdateText && (
                    <span className="text-slate-500">
                      Сүүлд шинэчлэгдсэн:{" "}
                      <span className="text-slate-200">{lastUpdateText}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Genres */}
              {manhua.genres && manhua.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-200">
                  {manhua.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {manhua.description && (
                <p className="mt-1 text-[13px] leading-relaxed text-slate-100/90">
                  {manhua.description}
                </p>
              )}

              {/* Author / Artist */}
              {(manhua.author || manhua.artist) && (
                <div className="mt-2 grid gap-2 text-[12px] text-slate-300/90 sm:grid-cols-2">
                  {manhua.author && (
                    <p>
                      Author:{" "}
                      <span className="font-medium text-slate-50">
                        {manhua.author}
                      </span>
                    </p>
                  )}
                  {manhua.artist && (
                    <p>
                      Artist:{" "}
                      <span className="font-medium text-slate-50">
                        {manhua.artist}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* CTA buttons */}
            {chapters.length > 0 && latestChapter && (
              <div className="mt-2 flex flex-wrap gap-2">
                {/* Latest */}
                <Link
                  href={`/manhua/${manhua.slug}/chapter/${latestChapter.chapterNumber}`}
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow shadow-cyan-500/40 hover:from-cyan-400 hover:to-emerald-300"
                >
                  Read latest – Ch. {latestChapter.chapterNumber}
                </Link>

                {/* Start from beginning */}
                {firstChapter && (
                  <Link
                    href={`/manhua/${manhua.slug}/chapter/${firstChapter.chapterNumber}`}
                    className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-900"
                  >
                    Start from beginning – Ch. {firstChapter.chapterNumber}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
