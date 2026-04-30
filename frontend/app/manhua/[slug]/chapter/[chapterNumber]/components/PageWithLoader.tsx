/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import PageSkeleton from "./PageSkeleton";

export interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

export default function PageWithLoader({ page }: { page: ChapterPage }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full">
      {!loaded && !error && <PageSkeleton />}

      {error && (
        <div className="flex min-h-[60vh] items-center justify-center text-[13px]" style={{ background: "var(--arc-card)", color: "oklch(0.75 0.18 15)" }}>
          Зургийг ачаалж чадсангүй...
        </div>
      )}

      <img
        src={page.imageUrl}
        alt={`Page ${page.pageNumber}`}
        loading={page.pageNumber <= 2 ? "eager" : "lazy"}
        className={`block w-full select-none transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
      />
    </div>
  );
}
