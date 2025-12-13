/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

export interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

export default function PageWithLoader({ page }: { page: ChapterPage }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full mb-2">
      {!loaded && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40">
          <div className="loader scale-75 md:scale-90" />
        </div>
      )}

      {error && (
        <div className="flex h-[60vh] items-center justify-center bg-slate-900 text-sm text-red-400">
          Зургийг ачаалж чадсангүй...
        </div>
      )}

      <img
        src={page.imageUrl}
        alt=""
        loading="lazy"
        className={`block w-full select-none transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />
    </div>
  );
}
