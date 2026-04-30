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
  genres: string;
  rating: string;
};

const GENRE_OPTIONS = [
  "Action", "Adventure", "Romance", "Comedy", "Drama", "Fantasy",
  "School Life", "Slice of Life", "Isekai", "Martial Arts", "Shounen", "Shoujo",
];

const selectStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "8px 12px", fontSize: 12,
  color: "var(--arc-text)", outline: "none",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
};

interface BasicInfoPanelProps {
  form: ManhuaFormState;
  setForm: React.Dispatch<React.SetStateAction<ManhuaFormState>>;
  error: string | null;
  saving: boolean;
  deleting: boolean;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
}

export function BasicInfoPanel({ form, setForm, error, saving, deleting, onSave, onDelete }: BasicInfoPanelProps) {
  const selectedGenres = React.useMemo(
    () => form.genres.split(",").map((g) => g.trim()).filter(Boolean),
    [form.genres]
  );

  const toggleGenre = (genre: string) => {
    setForm((prev) => {
      const current = prev.genres.split(",").map((g) => g.trim()).filter(Boolean);
      const exists = current.includes(genre);
      const next = exists ? current.filter((g) => g !== genre) : [...current, genre];
      return { ...prev, genres: next.join(", ") };
    });
  };

  const numericRating = (() => {
    const n = parseFloat(form.rating);
    if (isNaN(n)) return 0;
    return Math.min(5, Math.max(0, n));
  })();

  return (
    <PanelShell title="Үндсэн мэдээлэл">
      {error && (
        <div className="mb-3 rounded-[8px] px-3 py-2 text-[11px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      <form onSubmit={onSave} className="space-y-3">
        <div>
          <Label>Гарчиг <span style={{ color: "var(--arc-rose)" }}>*</span></Label>
          <TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </div>

        <div>
          <Label>Гарчиг (EN)</Label>
          <TextInput value={form.titleEn} onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))} placeholder="English title (optional)" />
        </div>

        <div>
          <Label>
            Slug{" "}
            <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>(/manhua/slug — болгоомжтой)</span>
          </Label>
          <TextInput value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="my-manhua-slug" />
        </div>

        <div>
          <Label>Тайлбар</Label>
          <TextArea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Статус</Label>
            <select style={selectStyle} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="hiatus">Hiatus</option>
            </select>
          </div>

          <div>
            <Label>Жанр (сонгох)</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => {
                const active = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className="rounded-full text-[11px] transition-all"
                    style={{
                      padding: "3px 10px",
                      border: active ? "1px solid oklch(0.72 0.17 195/.5)" : "1px solid var(--arc-border)",
                      background: active ? "oklch(0.72 0.17 195/.1)" : "transparent",
                      color: active ? "var(--arc-cyan)" : "var(--arc-dim)",
                      cursor: "pointer",
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            {selectedGenres.length > 0 && (
              <p className="mt-1.5 text-[10px]" style={{ color: "var(--arc-muted)" }}>
                Сонгосон: <span style={{ color: "var(--arc-dim)" }}>{selectedGenres.join(", ")}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <Label>Рейтинг (0–5)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              type="number"
              small
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              style={{ width: 100 }}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") { setForm((f) => ({ ...f, rating: "" })); return; }
                const n = parseFloat(v);
                if (!isNaN(n)) setForm((f) => ({ ...f, rating: Math.min(5, Math.max(0, n)).toString() }));
              }}
              placeholder="4.8"
            />
            <StarPreview rating={numericRating} />
          </div>
        </div>

        <input type="hidden" value={form.coverImage} readOnly />

        <div
          className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-3"
          style={{ borderTop: "1px solid var(--arc-border)" }}
        >
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-[9px] px-3 py-2 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "var(--arc-rose)", cursor: "pointer" }}
          >
            {deleting ? "Устгаж байна..." : "Устгах"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-[9px] px-5 py-2 text-[11px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </PanelShell>
  );
}

function StarPreview({ rating }: { rating: number }) {
  const percentage = (rating / 5) * 100;
  return (
    <div className="relative inline-flex">
      <div className="flex text-[16px]" style={{ color: "var(--arc-border)" }}>{"★★★★★"}</div>
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${percentage}%` }}>
        <div className="flex text-[16px]" style={{ color: "var(--arc-amber)" }}>{"★★★★★"}</div>
      </div>
    </div>
  );
}
