// src/app/admin/manhuas/components/BasicInfoPanel.tsx
"use client";

import React from "react";
import { PanelShell } from "./PanelShell";
import { Label, TextInput, TextArea } from "./FormControls";

export type ManhuaFormState = {
  title: string;
  titleEn: string;
  slug: string;
  description: string;
  coverImage: string;
  status: string;
  genres: string; // comma separated
  rating: string; // 0–5, задгай тоо (4.8, 4.9 гэх мэт)
};

const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Romance",
  "Comedy",
  "Drama",
  "Fantasy",
  "School Life",
  "Slice of Life",
  "Isekai",
  "Martial Arts",
  "Shounen",
  "Shoujo",
];

interface BasicInfoPanelProps {
  form: ManhuaFormState;
  setForm: React.Dispatch<React.SetStateAction<ManhuaFormState>>;
  error: string | null;
  saving: boolean;
  deleting: boolean;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
}

export function BasicInfoPanel({
  form,
  setForm,
  error,
  saving,
  deleting,
  onSave,
  onDelete,
}: BasicInfoPanelProps) {
  // ─── Genres helper ─────────────────────
  const selectedGenres = React.useMemo(
    () =>
      form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    [form.genres]
  );

  const toggleGenre = (genre: string) => {
    setForm((prev) => {
      const current = prev.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      const exists = current.includes(genre);
      const next = exists
        ? current.filter((g) => g !== genre)
        : [...current, genre];

      return { ...prev, genres: next.join(", ") };
    });
  };

  // ─── Rating helper ─────────────────────
  const numericRating = (() => {
    const n = parseFloat(form.rating);
    if (isNaN(n)) return 0;
    return Math.min(5, Math.max(0, n));
  })();

  return (
    <PanelShell title="Basic info">
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSave} className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <Label>
            Title<span className="text-red-400"> *</span>
          </Label>
          <TextInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>

        {/* Title (English) */}
        <div className="space-y-1">
          <Label>Title (EN)</Label>
          <TextInput
            value={form.titleEn}
            onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
            placeholder="English title (optional)"
          />
        </div>

        {/* Slug */}
        <div className="space-y-1">
          <Label>
            Slug
            <span className="ml-1 text-[10px] text-slate-500">
              (/manhua/slug – өөрчлөхдөө болгоомжтой)
            </span>
          </Label>
          <TextInput
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="my-manhua-slug"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label>Description</Label>
          <TextArea
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>

        {/* Status + Genres */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Status</Label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="hiatus">Hiatus</option>
            </select>
          </div>

          {/* Genres – чипэн сонголттой */}
          <div className="space-y-1">
            <Label>Genres (сонгох)</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => {
                const active = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                      active
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            {selectedGenres.length > 0 && (
              <p className="text-[10px] text-slate-500">
                Сонгосон:{" "}
                <span className="text-slate-200">
                  {selectedGenres.join(", ")}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Rating – 0–5, задгай тоотой, доор нь star preview */}
        <div className="space-y-1">
          <Label>Rating (0–5, ⭐)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              type="number"
              small
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setForm((f) => ({ ...f, rating: "" }));
                  return;
                }
                const n = parseFloat(v);
                if (isNaN(n)) return;
                const clamped = Math.min(5, Math.max(0, n));
                setForm((f) => ({ ...f, rating: clamped.toString() }));
              }}
              placeholder="Ж: 4.8"
            />
            <StarPreview rating={numericRating} />
            <span className="text-[11px] text-slate-500">
              0–5 хооронд задгай оноо өгч болно (4.8, 4.9 гэх мэт).
            </span>
          </div>
        </div>

        {/* hidden cover url */}
        <input type="hidden" value={form.coverImage} readOnly />

        {/* Buttons */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
          >
            {deleting ? "Устгаж байна..." : "Устгах"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow shadow-emerald-500/40 disabled:opacity-60"
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </PanelShell>
  );
}

// ─── Star preview component ────────────────
function StarPreview({ rating }: { rating: number }) {
  const percentage = (rating / 5) * 100;

  return (
    <div className="relative inline-flex">
      {/* background stars */}
      <div className="flex text-[14px] text-slate-600">
        {"★★★★★".split("").map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
      {/* filled stars */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${percentage}%` }}
      >
        <div className="flex text-[14px] text-amber-400">
          {"★★★★★".split("").map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
