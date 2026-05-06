/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  chapters: LatestChapter[];
  latestChapters?: LatestChapter[];
  cover: string;
};

type LatestUpdatesProps = {
  updates: LatestItem[];
  limitDesktop?: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTimeAgo(date?: string | Date): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date as string);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Саяхан";
  if (mins < 60) return `${mins}м өмнө`;
  if (hours < 24) return `${hours}ц өмнө`;
  if (days < 30) return `${days} өдөр өмнө`;
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

const LatestUpdates = ({ updates, limitDesktop = 50 }: LatestUpdatesProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = updates.slice(0, limitDesktop);

  return (
    <section className="w-full px-4 py-6">
      <div className="mx-auto" style={{ maxWidth: "var(--arc-max-w)" }}>
        <SectionHeader title="Latest Updates" />

        {/* 1 col mobile, 2 col desktop */}
        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{ gap: "2px 32px" }}
        >
          {items.map((item) => {
            const chapters = (
              item.latestChapters?.length ? item.latestChapters : item.chapters
            ).slice(0, 3);

            return (
              <div
                key={item.manhuaId}
                className="group flex gap-4 rounded-[10px] transition-colors"
                style={{ padding: "14px 10px", margin: "0 -10px" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.03)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
              >
                {/* COVER — large square */}
                <Link
                  href={`/manhua/${item.slug}`}
                  prefetch={false}
                  className="shrink-0 block"
                >
                  <div
                    className="overflow-hidden rounded-[10px]"
                    style={{
                      width: 76,
                      height: 108,
                      background: "var(--arc-elevated)",
                      border: "1px solid var(--arc-border)",
                      flexShrink: 0,
                    }}
                  >
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center"
                        style={{ color: "var(--arc-muted)" }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.3}>
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>

                {/* BODY */}
                <div className="flex flex-1 flex-col min-w-0 gap-2">
                  {/* Title */}
                  <Link href={`/manhua/${item.slug}`} prefetch={false}>
                    <h3
                      className="line-clamp-1 font-bold leading-snug transition-colors group-hover:text-[var(--arc-cyan)]"
                      style={{
                        fontFamily:
                          "var(--font-head, 'Space Grotesk', sans-serif)",
                        fontSize: 15,
                        color: "var(--arc-text)",
                      }}
                    >
                      {item.title}
                    </h3>
                  </Link>

                  {/* Chapters */}
                  <div className="flex flex-col gap-1.5">
                    {chapters.map((ch, idx) => {
                      const chNum = ch.chapterNumber ?? ch.number;
                      const isRead =
                        mounted && isChapterRead(item.slug, chNum ?? null);
                      const label =
                        chNum != null ? `Chapter ${chNum}` : `Chapter ${idx + 1}`;
                      const href =
                        chNum != null
                          ? `/manhua/${item.slug}/chapter/${chNum}`
                          : `/manhua/${item.slug}`;
                      const timeStr = formatTimeAgo(ch.createdAt);

                      return (
                        <div
                          key={`${item.slug}-${idx}`}
                          className="flex items-center gap-2"
                        >
                          {/* red dot */}
                          <span
                            className="shrink-0 rounded-full"
                            style={{
                              width: 6,
                              height: 6,
                              background: isRead
                                ? "var(--arc-muted)"
                                : "var(--arc-rose)",
                              opacity: isRead ? 0.4 : 1,
                              flexShrink: 0,
                            }}
                          />

                          {/* chapter link — takes remaining space */}
                          <Link
                            href={href}
                            prefetch={false}
                            className="flex-1 min-w-0 truncate text-[13px] transition-colors hover:text-white"
                            style={{
                              color: isRead
                                ? "var(--arc-muted)"
                                : "var(--arc-dim)",
                            }}
                          >
                            {label}
                          </Link>

                          {/* time — right-aligned */}
                          {timeStr && (
                            <span
                              className="shrink-0 text-[11px]"
                              style={{ color: "var(--arc-muted)" }}
                            >
                              {timeStr}
                            </span>
                          )}
                        </div>
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
