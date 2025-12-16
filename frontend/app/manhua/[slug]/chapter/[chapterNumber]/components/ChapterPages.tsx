"use client";

import { useState, useEffect } from "react";
import { ChapterPage } from "./PageWithLoader";
import PageSkeleton from "./PageSkeleton";

export interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  pages?: ChapterPage[];
  hasPrev: boolean;
  hasNext: boolean;
}

export default function ChapterPages({
  chapter,
  onPageLoad,
}: {
  chapter: Chapter;
  onPageLoad?: () => void;
}) {
  const pages = Array.isArray(chapter.pages) ? chapter.pages : [];
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  // If pages list is not loaded yet, show skeleton pages
  if (pages.length === 0) {
    return (
      <section className="w-full">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <PageSkeleton key={`skeleton-${i}`} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        {sorted.map((p) => (
          <PageItem
            key={p.pageNumber}
            page={p}
            onLoad={onPageLoad}
          />
        ))}
      </div>
    </section>
  );
}

// Separate component to track individual page loading
function PageItem({
  page,
  onLoad,
}: {
  page: ChapterPage;
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  return (
    <div className="relative w-full">
      {/* Skeleton placeholder - shown until image loads */}
      {!loaded && !error && <PageSkeleton />}

      {/* Error state */}
      {error && (
        <div className="flex min-h-[60vh] items-center justify-center bg-slate-900 text-sm text-red-400">
          Зургийг ачаалж чадсангүй...
        </div>
      )}

      {/* Image - positioned absolutely over skeleton, fades in when loaded */}
      <img
        src={page.imageUrl}
        alt={`Page ${page.pageNumber}`}
        loading={page.pageNumber <= 2 ? "eager" : "lazy"}
        className={`block w-full select-none transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0 absolute inset-0"
        }`}
        onLoad={handleLoad}
        onError={() => {
          setError(true);
          setLoaded(true);
          onLoad?.();
        }}
      />
    </div>
  );
}
