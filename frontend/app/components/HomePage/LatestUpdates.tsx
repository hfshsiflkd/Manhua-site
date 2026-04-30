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
  chapters: LatestChapter[];
  latestChapters?: LatestChapter[];
  cover: string;
};

type LatestUpdatesProps = {
  updates: LatestItem[];
  limitDesktop?: number;
};

function isNewWithinHours(date?: string | Date, hours = 8): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date as string);
  if (isNaN(d.getTime())) return false;
  const diffMs = Date.now() - d.getTime();
  return diffMs >= 0 && diffMs <= hours * 3600000;
}

function formatTimeAgo(date?: string | Date): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date as string);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days === 0) {
    if (hours >= 1) return `${hours}ц өмнө`;
    if (mins >= 1) return `${mins}м өмнө`;
    return "Саяхан";
  }
  if (days === 1) return "1 өдөр өмнө";
  if (days < 7) return `${days} өдөр өмнө`;
  return `${Math.floor(days / 7)} дол. өмнө`;
}

const LatestUpdates = ({ updates, limitDesktop = 6 }: LatestUpdatesProps) => {
  const items = updates.slice(0, limitDesktop);

  return (
    <section className="w-full px-4 py-6">
      <div className="mx-auto" style={{ maxWidth: "var(--arc-max-w)" }}>
        <SectionHeader title="Latest Updates" />

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "2px" }}>
          {items.map((item) => {
            const chapters = (item.latestChapters?.length ? item.latestChapters : item.chapters).slice(0, 3);

            return (
              <div
                key={item.manhuaId}
                className="group flex gap-3 rounded-[10px] transition-colors"
                style={{ padding: "12px", margin: "0 -12px" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* COVER */}
                <Link href={`/manhua/${item.slug}`} prefetch={false} className="shrink-0 block">
                  <div
                    className="overflow-hidden"
                    style={{
                      width: 50,
                      height: 70,
                      borderRadius: 7,
                      background: "var(--arc-elevated)",
                    }}
                  >
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>

                {/* BODY */}
                <div className="flex flex-1 flex-col min-w-0 gap-1.5">
                  <Link href={`/manhua/${item.slug}`} prefetch={false}>
                    <h3
                      className="line-clamp-2 text-[13px] font-semibold leading-snug transition-colors group-hover:text-[var(--arc-cyan)]"
                      style={{
                        fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)",
                        color: "var(--arc-text)",
                      }}
                    >
                      {item.title}
                    </h3>
                  </Link>

                  <div className="flex flex-col gap-1">
                    {chapters.map((ch, idx) => {
                      const isRead = isChapterRead(item.slug, ch.chapterNumber ?? null);
                      const isNew = !isRead && isNewWithinHours(ch.createdAt, 8);
                      const label = ch.chapterNumber != null ? `Chapter ${ch.chapterNumber}` : `Chapter ${idx + 1}`;
                      const href = ch.chapterNumber != null
                        ? `/manhua/${item.slug}/chapter/${ch.chapterNumber}`
                        : `/manhua/${item.slug}`;

                      return (
                        <div
                          key={`${item.slug}-${idx}`}
                          className="flex items-center gap-1.5 text-[12px]"
                          style={{ color: isRead ? "var(--arc-muted)" : "var(--arc-dim)" }}
                        >
                          <span
                            className="shrink-0 rounded-full"
                            style={{
                              width: 5,
                              height: 5,
                              background: isRead ? "var(--arc-muted)" : "var(--arc-rose)",
                              opacity: isRead ? 0.4 : 1,
                            }}
                          />
                          <Link
                            href={href}
                            prefetch={false}
                            className="flex-1 min-w-0 truncate hover:text-white transition-colors"
                          >
                            {label}
                          </Link>
                          {isNew && (
                            <span
                              className="shrink-0 rounded text-[9px] font-bold px-1 py-px"
                              style={{ background: "var(--arc-rose)", color: "#fff" }}
                            >
                              NEW
                            </span>
                          )}
                          <span className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--arc-muted)" }}>
                            {formatTimeAgo(ch.createdAt)}
                          </span>
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
