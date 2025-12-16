"use client";

import { Chapter } from "./ChapterPages";
import SmallSpinner from "./SmallSpinner";

export default function ChapterHeader({
  slug,
  chapter,
  onBack,
  isLoading,
  loadedCount,
  totalPages,
}: {
  slug: string;
  chapter: Chapter | null;
  onBack: () => void;
  isLoading?: boolean;
  loadedCount?: number;
  totalPages?: number;
}) {
  const showProgress = isLoading && loadedCount !== undefined && totalPages !== undefined && totalPages > 0;

  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 text-[13px] text-slate-300">
      <div className="flex items-center gap-2">
        <div>
          <p className="text-[12px] text-slate-500">{slug}</p>
          {chapter ? (
            <>
              <p className="font-semibold text-slate-100">
                Chapter {chapter.chapterNumber}
              </p>
              {chapter.title && (
                <p className="text-[12px] text-slate-400">{chapter.title}</p>
              )}
            </>
          ) : (
            <p className="font-semibold text-slate-100">Loading...</p>
          )}
        </div>
        {/* Small spinner - shown while loading */}
        {isLoading && (
          <div className="flex items-center gap-2">
            <SmallSpinner />
            {showProgress && (
              <span className="text-[11px] text-slate-500">
                {loadedCount} / {totalPages}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="rounded-full border border-slate-700 px-3 py-1 text-[12px] hover:border-cyan-400 hover:text-cyan-300"
      >
        Буцах
      </button>
    </header>
  );
}
