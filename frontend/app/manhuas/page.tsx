/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/manhuas/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Manhua } from "@/types/manhua";
import { ManhuaCard } from "./components/ManhuaCard";
import { ManhuaSkeleton } from "./components/ManhuaSkeleton";

interface ManhuaListResponse {
  items: Manhua[];
  total: number;
  page: number;
  limit: number;
}

const GENRES = [
  { value: "all", label: "Бүгд" },
  { value: "Romance", label: "Romance" },
  { value: "Comedy", label: "Comedy" },
  { value: "Drama", label: "Drama" },
  { value: "Action", label: "Action" },
  { value: "Fantasy", label: "Fantasy" },
  { value: "Slice of Life", label: "Slice of Life" },
  { value: "School", label: "School" },
  { value: "Isekai", label: "Isekai" },
  { value: "Adventure", label: "Adventure" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Бүгд" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ManhuasPage() {
  const [items, setItems] = useState<Manhua[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [searchInput, setSearchInput] = useState("");
  const [genre, setGenre] = useState("all");
  const [status, setStatus] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input (300ms)
  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const hasActiveFilters = useMemo(
    () => debouncedSearch !== "" || genre !== "all" || status !== "all",
    [debouncedSearch, genre, status]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page, limit };

      if (debouncedSearch) params.q = debouncedSearch;
      if (genre !== "all") params.genre = genre;
      if (status !== "all") params.status = status;

      const res = await api.get<ManhuaListResponse>("/manhuas", {
        params,
      });

      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Өгөгдөл ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [page, genre, status, debouncedSearch, limit]);

  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
  }, [debouncedSearch, genre, status]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setSearchInput("");
    setGenre("all");
    setStatus("all");
    setPage(1);
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header - Compact on Mobile */}
        <div className="space-y-1 sm:space-y-2">
          <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl lg:text-3xl">
            Манхуа жагсаалт
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm lg:text-base">
            Нэрээр хайх • Жанраар шүүх • Статус
          </p>
        </div>

        {/* Filter Bar - Mobile Optimized */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:rounded-2xl sm:p-4 lg:p-6">
          {/* Search Input - Always Visible */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-slate-500 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Хайх..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:rounded-xl sm:pl-10 sm:py-3"
            />
          </div>

          {/* Mobile: Collapsible Filters */}
          <div className="sm:hidden">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
            >
              <span>Шүүлт</span>
              <svg
                className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {filtersOpen && (
              <div className="mt-3 space-y-3">
                {/* Genre Filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Жанр
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => {
                      setGenre(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {GENRES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter - Scrollable Pills */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Статус
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setStatus(s.value);
                          setPage(1);
                        }}
                        className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                          status === s.value
                            ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-300"
                            : "border-slate-700 bg-slate-950/70 text-slate-400 active:bg-slate-900"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-medium text-slate-300 transition active:bg-slate-900"
                  >
                    Цэвэрлэх
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Always Visible Filters */}
          <div className="hidden sm:flex sm:items-center sm:gap-3 sm:justify-between">
            {/* Genre Filter */}
            <div className="flex-1 max-w-[200px]">
              <select
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter - Segmented Pills */}
            <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-950/70 p-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatus(s.value);
                    setPage(1);
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition-all sm:text-sm ${
                    status === s.value
                      ? "bg-cyan-500/20 text-cyan-300 shadow shadow-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 sm:px-6"
              >
                Цэвэрлэх
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Loading / List */}
        {loading ? (
          <>
            {/* Mobile: Modern grid skeletons */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <ManhuaSkeleton key={i} />
              ))}
            </div>
            {/* Desktop: Grid Skeletons */}
            <div className="hidden grid-cols-2 gap-4 sm:grid md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ManhuaSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Results Count */}
            {items.length > 0 && (
              <div className="text-xs text-slate-400 sm:text-sm">
                Нийт <span className="font-semibold text-slate-300">{total}</span>{" "}
                манхуа олдлоо
              </div>
            )}

            {/* Empty State */}
            {items.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center sm:rounded-2xl sm:px-6">
                <div className="mb-4 text-4xl sm:text-5xl">📭</div>
                <h3 className="mb-2 text-base font-semibold text-slate-100 sm:text-lg">
                  Тохирох манхуа олдсонгүй
                </h3>
                <p className="mb-6 max-w-md text-xs text-slate-400 sm:text-sm">
                  Filter-ээ арилгаад дахин хайна уу.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 transition active:scale-95"
                  >
                    Filter цэвэрлэх
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: Modern grid cards (2 columns) */}
                <div className="grid grid-cols-2 gap-3 sm:hidden">
                  {items.map((m) => (
                    <ManhuaCard key={m._id} manhua={m} variant="mobile" />
                  ))}
                </div>

                {/* Desktop: Grid Cards */}
                <div className="hidden grid-cols-2 gap-4 sm:grid md:grid-cols-3 lg:grid-cols-4">
                  {items.map((m) => (
                    <ManhuaCard key={m._id} manhua={m} />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300 sm:text-sm">
                <button
                  disabled={!hasPrev}
                  onClick={() => hasPrev && setPage((p) => p - 1)}
                  className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 hover:border-cyan-500/60 hover:bg-slate-800 sm:px-6"
                >
                  ← Өмнөх
                </button>
                <span className="text-xs sm:text-sm">
                  Хуудас <span className="font-semibold">{page}</span> /{" "}
                  {totalPages}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => hasNext && setPage((p) => p + 1)}
                  className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 hover:border-cyan-500/60 hover:bg-slate-800 sm:px-6"
                >
                  Дараах →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
