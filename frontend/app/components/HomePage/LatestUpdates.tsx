/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { SectionHeader } from "./SectionHeader";
import { isChapterRead } from "@/lib/useReadState";

type LatestChapter = {
  name?: string;
  time?: string;
  createdAt?: string;
  updatedAt?: string;
  upcoming?: boolean;
  number?: number;
  chapterNumber?: number;
};

type LatestItem = {
  manhuaId: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  chapters: LatestChapter[];
  latestChapters?: LatestChapter[];
  hasMoreChapters?: boolean;
  cover: string;
};

type LatestUpdatesProps = {
  updates: LatestItem[];
  limitMobile?: number;
  limitDesktop?: number;
  showSeeAll?: boolean;
  seeAllHref?: string;
};

// Skeleton loader for mobile (horizontal row)
function LatestUpdateSkeletonMobile() {
  return (
    <div className="flex gap-3 rounded-lg bg-black/40 p-3 animate-pulse">
      <div className="h-20 w-16 shrink-0 rounded-md bg-slate-800" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-3/4 rounded bg-slate-800" />
        <div className="h-3 w-1/2 rounded bg-slate-800" />
        <div className="h-3 w-1/3 rounded bg-slate-800" />
      </div>
    </div>
  );
}

// Skeleton loader for desktop (grid card)
function LatestUpdateSkeletonDesktop() {
  return (
    <div className="flex gap-4 rounded-xl bg-black/40 p-4 animate-pulse">
      <div className="h-[130px] w-[95px] shrink-0 rounded-lg bg-slate-800" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-5 w-3/4 rounded bg-slate-800" />
        <div className="h-4 w-full rounded bg-slate-800" />
        <div className="h-4 w-2/3 rounded bg-slate-800" />
      </div>
    </div>
  );
}

function formatTimeAgoSafe(date?: string | Date): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    const futureDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    if (futureDays === 0) return "Soon";
    if (futureDays === 1) return "in 1 day";
    return `in ${futureDays} days`;
  }

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

const LatestUpdates = ({
  updates,
  limitMobile = 4,
  limitDesktop = 6,
  showSeeAll = true,
  seeAllHref = "/manhuas?sort=latest",
}: LatestUpdatesProps) => {
  const items = updates.slice(0, limitDesktop);
  const loading = false; // Can be made dynamic if needed

  // Use createdAt (when chapter was added/uploaded) for time display
  const getTimeLabel = (ch: LatestChapter) =>
    ch.createdAt ? formatTimeAgoSafe(ch.createdAt) : ch.time ?? "";

  if (loading) {
    return (
      <section className="w-full px-4 py-6 md:py-8 text-white">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeader
            title="Latest Updates"
            seeAllHref={showSeeAll ? seeAllHref : undefined}
            seeAllText="Бүгдийг харах →"
            gradientFrom="from-fuchsia-400"
            gradientTo="to-pink-400"
          />
          <div className="bg-slate-900/70 rounded-xl p-3 md:p-4 shadow-lg">
            {/* Mobile skeletons */}
            <div className="space-y-2 md:hidden">
              {Array.from({ length: limitMobile }).map((_, i) => (
                <LatestUpdateSkeletonMobile key={i} />
              ))}
            </div>
            {/* Desktop skeletons */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: limitDesktop }).map((_, i) => (
                <LatestUpdateSkeletonDesktop key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section className="w-full px-4 py-6 md:py-8 text-white">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeader
            title="Latest Updates"
            seeAllHref={showSeeAll ? seeAllHref : undefined}
            seeAllText="Бүгдийг харах →"
            gradientFrom="from-fuchsia-400"
            gradientTo="to-pink-400"
          />
          <div className="bg-slate-900/70 rounded-xl p-6 md:p-8 shadow-lg text-center">
            <p className="text-gray-400 text-base mb-2">Шинэчлэлт алга байна</p>
            <p className="text-gray-500 text-sm">
              Манхуа нэмэгдэхэд энд харагдах болно
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full px-4 py-6 md:py-8 text-white">
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}
        <SectionHeader
          title="Latest Updates"
          seeAllHref={showSeeAll ? seeAllHref : undefined}
          seeAllText="Бүгдийг харах →"
          gradientFrom="from-fuchsia-400"
          gradientTo="to-pink-400"
        />

        <div className="bg-transparent">
          <div className="flex flex-col divide-y divide-white/10">
            {items.map((item) => {
              const chapterSource =
                item.latestChapters && item.latestChapters.length > 0
                  ? item.latestChapters
                  : item.chapters || [];
              const chapters = chapterSource.slice(0, 3);

              return (
                <div key={item.manhuaId} className="flex gap-3 py-3">
                  {/* COVER */}
                  <Link href={`/manhua/${item.slug}`} className="shrink-0">
                    <div className="w-14 h-[84px] md:w-16 md:h-[96px] overflow-hidden rounded-xl bg-slate-800 border border-white/5">
                      <img
                        src={item.cover}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </Link>

                  {/* CONTENT */}
                  <div className="flex flex-1 flex-col min-w-0">
                    <Link
                      href={`/manhua/${item.slug}`}
                      className="block min-w-0"
                    >
                      <h3 className="line-clamp-2 text-[13px] md:text-sm font-semibold text-white break-words">
                        {item.title}
                      </h3>
                    </Link>

                    <div className="mt-2 space-y-1">
                      {chapters.map((ch, idx) => {
                        const label =
                          ch.chapterNumber != null
                            ? ch.name
                              ? `Chapter ${ch.chapterNumber} – ${ch.name}`
                              : `Chapter ${ch.chapterNumber}`
                            : typeof ch.name === "string"
                            ? ch.name
                            : `Chapter ${idx + 1}`;
                        const timeLabel = getTimeLabel(ch);
                        const href =
                          ch.chapterNumber != null
                            ? `/manhua/${item.slug}/chapter/${ch.chapterNumber}`
                            : `/manhua/${item.slug}`;

                        // Check if chapter is read
                        const isRead = isChapterRead(
                          item.slug,
                          ch.chapterNumber ?? null
                        );

                        return (
                          <Link
                            key={`${item.slug}-${idx}`}
                            href={href}
                            className={`flex items-center gap-2 text-[12px] md:text-sm transition truncate ${
                              isRead
                                ? "text-gray-500 hover:text-gray-300 font-normal"
                                : "text-gray-300 hover:text-white font-medium"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                isRead ? "bg-gray-600" : "bg-red-500"
                              }`}
                            />
                            <span className="truncate">{label}</span>
                            {timeLabel && (
                              <span className="ml-auto w-20 text-right text-[11px] md:text-xs text-gray-500 whitespace-nowrap">
                                {timeLabel}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
