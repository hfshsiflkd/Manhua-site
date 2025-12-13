"use client";

import { Chapter } from "./ChapterPages";

export default function ChapterHeader({
  slug,
  chapter,
  onBack,
}: {
  slug: string;
  chapter: Chapter;
  onBack: () => void;
}) {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 text-[13px] text-slate-300">
      <div>
        <p className="text-[12px] text-slate-500">{slug}</p>
        <p className="font-semibold text-slate-100">
          Chapter {chapter.chapterNumber}
        </p>
        {chapter.title && (
          <p className="text-[12px] text-slate-400">{chapter.title}</p>
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
