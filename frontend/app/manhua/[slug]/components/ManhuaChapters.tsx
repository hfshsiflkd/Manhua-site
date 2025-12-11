// src/components/manhua/ManhuaChapters.tsx

import Link from "next/link";
import { useState, useMemo } from "react";
import type { Chapter } from "@/types/manhua";

type ManhuaChaptersProps = {
  slug: string;
  chapters: Chapter[];
};

function getTimeAgo(dateStr?: string | null) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0) {
    return "In a moment";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}


function getChapterAddedTime(ch: Chapter) {
  const base = ch.releaseAt || ch.createdAt || ch.updatedAt;
  return getTimeAgo(base || undefined);
}

export function ManhuaChapters({ slug, chapters }: ManhuaChaptersProps) {
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Sort хийх
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => {
      return sortOrder === "desc"
        ? b.chapterNumber - a.chapterNumber
        : a.chapterNumber - b.chapterNumber;
    });
  }, [chapters, sortOrder]);

  return (
    <section id="chapters" className="space-y-3 px-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Chapters
        </h2>

        <div className="flex items-center gap-3">
          {chapters.length > 0 && (
            <span className="text-[11px] text-slate-500">
              Нийт {chapters.length} chapter
            </span>
          )}

          {/* Sort toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            Sort: {sortOrder === "desc" ? "Newest ↓" : "Oldest ↑"}
          </button>
        </div>
      </div>

      {/* Chapter list */}
      {sortedChapters.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-center text-xs text-slate-400">
          Одоогоор chapter нэмэгдээгүй байна.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40">
          <ul className="divide-y divide-slate-800/80 text-[13px]">
            {sortedChapters.map((ch) => {
              const addedTime = getChapterAddedTime(ch);

              return (
                <li key={ch._id}>
                  <Link
                    href={`/manhua/${slug}/chapter/${ch.chapterNumber}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-900/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-0.5 text-[11px] text-cyan-300">
                        Ch. {ch.chapterNumber}
                      </span>
                      <span className="line-clamp-1 text-[13px] text-slate-100">
                        {ch.title || `Chapter ${ch.chapterNumber}`}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      {addedTime ? `${addedTime}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
