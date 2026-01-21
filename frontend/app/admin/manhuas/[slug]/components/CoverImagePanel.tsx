// src/app/admin/manhuas/components/CoverImagePanel.tsx
"use client";

import React from "react";
import { PanelShell } from "./PanelShell";

interface CoverImagePanelProps {
  coverPreview: string;
  title: string;
  uploadingCover: boolean;
  coverProgress: number | null;
  onChangeCover: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CoverImagePanel({
  coverPreview,
  title,
  uploadingCover,
  coverProgress,
  onChangeCover,
}: CoverImagePanelProps) {
  return (
    <PanelShell
      title="Cover image"
      right={
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChangeCover}
          />
          {uploadingCover ? "Uploading..." : "Change cover"}
        </label>
      }
    >
      {coverProgress !== null && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{uploadingCover ? "Upload хийж байна..." : "Upload"}</span>
            <span className="font-mono text-slate-200">{coverProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-[width] duration-200"
              style={{ width: `${coverProgress}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <div className="relative aspect-[3/4] w-24 overflow-hidden rounded-lg bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverPreview}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Энэ зургийг манхуагийн нүүр зураг болгон ашиглана.{" "}
          <span className="text-slate-200">Change cover</span> дарж шинэ файл
          сонгож upload хийнэ.
        </p>
      </div>
    </PanelShell>
  );
}
