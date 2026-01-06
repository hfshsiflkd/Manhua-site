/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { SectionHeader } from "./SectionHeader";
import { isChapterRead } from "@/lib/useReadState";

/* ================= TYPES ================= */

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
  chapters: LatestChapter[];
  latestChapters?: LatestChapter[];
  cover: string;
};

type LatestUpdatesProps = {
  updates: LatestItem[];
  limitDesktop?: number;
};

/* ================= HELPERS ================= */

// Chapter NEW эсэх (8 цаг)
function isNewWithinHours(date?: string | Date, hours = 8): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return false;

  const diffMs = Date.now() - d.getTime();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

function formatTimeAgoSafe(date?: string | Date): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const diffMs = Date.now() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    if (diffHours >= 1) return `${diffHours}ц өмнө`;
    if (diffMinutes >= 1) return `${diffMinutes}м өмнө`;
    return "Саяхан";
  }

  if (diffDays === 1) return "1 өдөр өмнө";
  if (diffDays < 7) return `${diffDays} өдөр өмнө`;

  return `${Math.floor(diffDays / 7)} долоо хоног өмнө`;
}

/* ================= COMPONENT ================= */

const LatestUpdates = ({ updates, limitDesktop = 6 }: LatestUpdatesProps) => {
  const items = updates.slice(0, limitDesktop);

  return (
    <section className="w-full px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="Latest Updates" />

        <div className="flex flex-col divide-y divide-white/10">
          {items.map((item) => {
            const chapters = item.latestChapters?.length
              ? item.latestChapters.slice(0, 3)
              : item.chapters.slice(0, 3);

            return (
              <div key={item.manhuaId} className="flex gap-3 py-3">
                {/* COVER */}
                <Link href={`/manhua/${item.slug}`} className="shrink-0">
                  <div className="w-14 h-[84px] overflow-hidden rounded-xl bg-slate-800">
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>

                {/* CONTENT */}
                <div className="flex flex-1 flex-col min-w-0">
                  <Link href={`/manhua/${item.slug}`}>
                    <h3 className="line-clamp-2 text-sm font-semibold">
                      {item.title}
                    </h3>
                  </Link>

                  {/* ===== CHAPTER LIST ===== */}
                  <div className="mt-2 space-y-1">
                    {chapters.map((ch, idx) => {
                      const isRead = isChapterRead(
                        item.slug,
                        ch.chapterNumber ?? null
                      );

                      // 🔥 CHAPTER NEW
                      const isNewChapter =
                        !isRead && isNewWithinHours(ch.createdAt, 8);

                      const label =
                        ch.chapterNumber != null
                          ? `Chapter ${ch.chapterNumber}`
                          : `Chapter ${idx + 1}`;

                      const href =
                        ch.chapterNumber != null
                          ? `/manhua/${item.slug}/chapter/${ch.chapterNumber}`
                          : `/manhua/${item.slug}`;

                      return (
                        <Link
                          key={`${item.slug}-${idx}`}
                          href={href}
                          className={`flex items-center gap-2 text-[12px] md:text-sm truncate ${
                            isRead
                              ? "text-gray-500"
                              : "text-gray-300 hover:text-white"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              isRead ? "bg-gray-600" : "bg-red-500"
                            }`}
                          />

                          <span className="truncate">{label}</span>

                          {/* 🔴 NEW BADGE */}
                          {isNewChapter && (
                            <span className="ml-1 rounded bg-red-500 px-1.5 py-[1px] text-[9px] font-bold text-white">
                              NEW
                            </span>
                          )}

                          <span className="ml-auto text-[11px] text-gray-500">
                            {formatTimeAgoSafe(ch.createdAt)}
                          </span>
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
    </section>
  );
};

export default LatestUpdates;
