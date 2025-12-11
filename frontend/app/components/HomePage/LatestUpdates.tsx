/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

const MAX_TO_SHOW = 20;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

type LatestChapter = {
  name: string;
  // эд нарын аль нэг нь ирж болно
  time?: string; // "Just now", "3m ago", "1h ago" гэх мэт (backend-ээс)
  createdAt?: string; // ISO datetime (optional)
  updatedAt?: string; // ISO datetime (optional)
  upcoming: boolean;
  number?: number;
  chapterNumber?: number;
};

type LatestItem = {
  manhuaId: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  chapters: LatestChapter[];
  cover: string;
};

type LatestUpdatesProps = {
  updates: LatestItem[];
};

// name-с chapterNumber гаргаж авах helper
function getChapterNumber(ch: LatestChapter): number | undefined {
  if (ch.number != null) return ch.number;
  if (ch.chapterNumber != null) return ch.chapterNumber;

  const match = ch.name.match(/\d+/);
  if (!match) return undefined;

  const n = Number(match[0]);
  return Number.isNaN(n) ? undefined : n;
}

// Chapter-н нэрээс "Chapter 12" хэсгийг цэвэрлэх
function cleanChapterName(name: string) {
  return name
    .replace(/chapter[\s.:_-]*\d+/gi, "")
    .replace(/^\s*[:-]\s*/, "")
    .trim();
}

/**
 * ISO date → "Just now" / "3m ago" / "2h ago" / "3 days ago" гэх мэт
 */
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

  // 🔮 Ирээдүйд нийтлэхээр төлөвлөсөн chapter
  if (diffMs < 0) {
    const futureDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    if (futureDays === 0) return "Soon";
    if (futureDays === 1) return "in 1 day";
    return `in ${futureDays} days`;
  }

  // ⏱ Өнөөдөр, өчигдөр г.м
  if (diffDays === 0) {
    if (diffHours >= 1) return `${diffHours}h ago`;
    if (diffMinutes >= 1) return `${diffMinutes}m ago`;
    return "Just now";
  }

  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}

/**
 * "New" badge харуулах эсэх:
 *  1) Хэрвээ ISO date (updatedAt/createdAt) байвал → яг millisec-ээр 6 цагтай харьцуулна
 *  2) ISO байхгүй, зөвхөн `time` string байгаа бол → formatTimeAgoSafe-ийн гаралтанд тааруулж parse хийнэ
 */
function isNewChapter(ch: LatestChapter): boolean {
  // 1️⃣ Эхлээд updatedAt / createdAt-ыг шалгана (байгаа бол энэ нь илүү найдвартай)
  const iso = ch.updatedAt ?? ch.createdAt;
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const diffMs = Date.now() - d.getTime();
      if (diffMs >= 0 && diffMs <= SIX_HOURS_MS) {
        return true;
      }
      // ISO байгаад 6 цагаас хоцорсон байвал цааш parse хийх шаардлагагүй
      return false;
    }
  }

  // 2️⃣ ISO байгаагүй эсвэл parse болохгүй бол time string-ээ ашиглая
  if (!ch.time) return false;

  const t = ch.time.toLowerCase().trim();

  if (t === "just now") return true;

  // "3m ago", "10 min ago"
  const minMatch = t.match(/(\d+)\s*(m|min|mins|minute|minutes)/);
  if (minMatch) {
    const mins = Number(minMatch[1]);
    if (!Number.isNaN(mins) && mins <= 6 * 60) return true;
  }

  // "1h ago", "2 hours ago", "1 цагийн өмнө"
  const hourMatch = t.match(/(\d+)\s*(h|hr|hrs|hour|hours|цаг)/);
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    if (!Number.isNaN(hours) && hours <= 6) return true;
  }

  return false;
}

const LatestUpdates = ({ updates }: LatestUpdatesProps) => {
  const router = useRouter();
  const items = updates.slice(0, MAX_TO_SHOW);

  return (
    <section className="w-full text-white">
      <div className="mx-auto w-full max-w-6xl  bg-slate-900/70 px-3 py-4 md:px-6 md:py-5 shadow-lg">
        {/* HEADER BAR */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-fuchsia-500" />
            <h2 className="text-xl font-bold md:text-2xl tracking-tight">
              Latest Updates
            </h2>
          </div>
        </div>

        {/* LIST – 1 col on mobile, 2 cols on laptop */}
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.manhuaId}
              className="flex cursor-pointer gap-4 rounded-xl bg-black/40 px-4 py-4 transition hover:-translate-y-0.5 hover:bg-black/60"
              onClick={() => router.push(`/manhua/${item.slug}`)}
            >
              {/* COVER */}
              <Link href={`/manhua/${item.slug}`} className="flex gap-4">
                <div className="h-[130px] w-[95px] shrink-0 overflow-hidden rounded-lg border border-white/5">
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </Link>

              {/* RIGHT SIDE */}
              <div className="flex flex-1 flex-col">
                {/* TITLE */}
                <Link href={`/manhua/${item.slug}`} className="block min-w-0">
                  <h3
                    className="
      mb-2 font-semibold hover:text-fuchsia-400
      text-base md:text-xl
      line-clamp-2 md:line-clamp-1
      break-words
    "
                  >
                    {item.title}
                  </h3>
                </Link>

                {/* CHAPTERS */}
                <div className="space-y-1.5 text-base">
                  {item.chapters.map((ch, i) => {
                    const chapterNumber = getChapterNumber(ch);
                    const href =
                      chapterNumber != null
                        ? `/manhua/${item.slug}/chapter/${chapterNumber}`
                        : `/manhua/${item.slug}`;

                    const handleChapterClick = (
                      e: MouseEvent<HTMLButtonElement>
                    ) => {
                      e.stopPropagation();
                      router.push(href);
                    };

                    const baseName = cleanChapterName(ch.name);
                    const isNew = isNewChapter(ch);

                    const timeLabel =
                      ch.updatedAt || ch.createdAt
                        ? formatTimeAgoSafe(ch.updatedAt || ch.createdAt)
                        : ch.time ?? "";

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={handleChapterClick}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 
                        text-sm md:text-[15px] text-gray-200 transition
                        hover:bg-white/5 hover:text-white"
                      >
                        {/* LEFT: bullet + chapter name + NEW */}
                        <div className="flex min-w-0 items-center gap-2 flex-wrap">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          <p className="truncate font-medium">
                            {chapterNumber != null
                              ? baseName
                                ? `Chapter ${chapterNumber}: ${baseName}`
                                : `Chapter ${chapterNumber}`
                              : ch.name}
                          </p>
                          {isNew && (
                            <span
                              className="ml-1 rounded-full bg-emerald-500/90 px-2 py-0.5
                              text-[10px] font-bold uppercase tracking-wide animate-pulse"
                            >
                              New
                            </span>
                          )}
                        </div>

                        {/* RIGHT: upcoming + time */}
                        <div className="flex flex-shrink-0 items-center gap-1 text-[11px] md:text-xs text-gray-300">
                          {ch.upcoming && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-700/50 text-[10px] text-fuchsia-200">
                              ⏱
                            </span>
                          )}
                          {timeLabel && (
                            <span className="whitespace-nowrap">
                              {timeLabel}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
