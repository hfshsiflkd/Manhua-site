// src/app/admin/manhuas/components/ManhuaTopBar.tsx
"use client";
import type { Manhua } from "@/lib/api";

interface ManhuaTopBarProps {
  manhua: Manhua;
  coverPreview: string;
  statusClass: string;
  createdAt: string | null;
  updatedAt: string | null;
  publicUrl: string;
  onBack: () => void;
}

export function ManhuaTopBar({
  manhua,
  coverPreview,
  statusClass,
  createdAt,
  updatedAt,
  publicUrl,
  onBack,
}: ManhuaTopBarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-3">
        <div className="relative h-16 w-12 overflow-hidden rounded-md bg-slate-900/80 shadow shadow-black/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverPreview}
            alt={manhua.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-sm font-semibold text-slate-50 sm:text-base">
            {manhua.title}
          </h1>
          {manhua.slug && (
            <p className="text-[11px] text-slate-400">
              /manhua/
              <span className="font-mono text-slate-200">{manhua.slug}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
            >
              {manhua.status || "ongoing"}
            </span>
            {manhua.genres && manhua.genres.length > 0 && (
              <span className="line-clamp-1 text-[11px] text-slate-300">
                {manhua.genres.join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 text-[11px] text-slate-400 md:items-end">
        <div className="flex flex-wrap gap-2">
          {createdAt && (
            <span>
              Created: <span className="text-slate-100">{createdAt}</span>
            </span>
          )}
          {updatedAt && (
            <span>
              Updated: <span className="text-slate-100">{updatedAt}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-900"
          >
            ← Back
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-cyan-500/90 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-cyan-400"
          >
            Open public page
          </a>
        </div>
      </div>
    </div>
  );
}
