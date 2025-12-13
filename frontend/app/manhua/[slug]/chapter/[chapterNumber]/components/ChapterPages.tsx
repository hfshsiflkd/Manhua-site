"use client";

import PageWithLoader, { ChapterPage } from "./PageWithLoader";

export interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  pages?: ChapterPage[];
  hasPrev: boolean;
  hasNext: boolean;
}

export default function ChapterPages({ chapter }: { chapter: Chapter }) {
  const pages = Array.isArray(chapter.pages) ? chapter.pages : [];
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <section className="w-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        {sorted.map((p) => (
          <PageWithLoader key={p.pageNumber} page={p} />
        ))}
      </div>
    </section>
  );
}
