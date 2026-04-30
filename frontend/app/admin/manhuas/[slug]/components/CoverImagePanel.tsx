/* eslint-disable @next/next/no-img-element */
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

export function CoverImagePanel({ coverPreview, title, uploadingCover, coverProgress, onChangeCover }: CoverImagePanelProps) {
  return (
    <PanelShell
      title="Cover зураг"
      right={
        <label
          className="inline-flex cursor-pointer items-center justify-center rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
          style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)", cursor: "pointer" }}
        >
          <input type="file" accept="image/*" className="hidden" onChange={onChangeCover} />
          {uploadingCover ? "Upload хийж байна..." : "Cover солих"}
        </label>
      }
    >
      {coverProgress !== null && (
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--arc-muted)" }}>
            <span>{uploadingCover ? "Upload хийж байна..." : "Upload дууслаа"}</span>
            <span style={{ color: "var(--arc-text)", fontVariantNumeric: "tabular-nums" }}>{coverProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: `${coverProgress}%`, background: "var(--arc-cyan)" }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-4 items-start">
        <div
          className="shrink-0 overflow-hidden"
          style={{ width: 90, aspectRatio: "3/4", borderRadius: 10, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
        >
          <img src={coverPreview} alt={title} className="h-full w-full object-cover" />
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--arc-muted)" }}>
          Энэ зургийг манхуагийн нүүр зураг болгон ашиглана.{" "}
          <span style={{ color: "var(--arc-dim)" }}>Cover солих</span> дарж шинэ файл сонгож upload хийнэ.
          <br /><br />
          Дэмжигдэх форматууд: JPG, PNG, WebP
        </p>
      </div>
    </PanelShell>
  );
}
