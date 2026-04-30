/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Manhua } from "@/types/manhua";
import { ManhuaCard } from "./components/ManhuaCard";
import { ManhuaSkeleton, ManhuaSkeletonHorizontal } from "./components/ManhuaSkeleton";

interface ManhuaListResponse {
  items: Manhua[];
  total: number;
  page: number;
  limit: number;
}

interface TeamOption {
  _id: string;
  name: string;
}

const GENRES = [
  "Бүгд", "Romance", "Comedy", "Drama", "Action", "Fantasy",
  "Slice of Life", "School", "Isekai", "Adventure", "System", "Mystery", "Martial Arts",
];

const STATUSES = [
  { value: "all", label: "Бүгд" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
];

const SORTS = [
  { value: "popular", label: "Trending" },
  { value: "rating", label: "Top Rated" },
  { value: "latest", label: "Latest" },
  { value: "az", label: "A–Z" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const pillBase: React.CSSProperties = {
  padding: "5px 13px", borderRadius: 20,
  border: "1px solid var(--arc-border)", background: "transparent",
  color: "var(--arc-dim)", fontSize: 12, fontWeight: 500,
  cursor: "pointer", whiteSpace: "nowrap",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  transition: "all .15s",
};

const pillActive: React.CSSProperties = {
  ...pillBase,
  borderColor: "oklch(0.72 0.17 195/.5)",
  background: "oklch(0.72 0.17 195/.1)",
  color: "var(--arc-cyan)",
};

export default function ManhuasPage() {
  const [items, setItems] = useState<Manhua[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [searchInput, setSearchInput] = useState("");
  const [genre, setGenre] = useState("Бүгд");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("popular");
  const [teamId, setTeamId] = useState("all");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const hasActiveFilters = useMemo(
    () => debouncedSearch !== "" || genre !== "Бүгд" || status !== "all" || teamId !== "all",
    [debouncedSearch, genre, status, teamId]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (debouncedSearch) params.q = debouncedSearch;
      if (genre !== "Бүгд") params.genre = genre;
      if (status !== "all") params.status = status;
      if (teamId !== "all") params.teamId = teamId;
      if (sort !== "popular") params.sort = sort;
      const res = await api.get<ManhuaListResponse>("/manhuas", { params });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Өгөгдөл ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [page, genre, status, teamId, sort, debouncedSearch, limit]);

  useEffect(() => { setPage(1); }, [debouncedSearch, genre, status, teamId, sort]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    api.get<TeamOption[]>("/manhuas/teams")
      .then((res) => { if (active) setTeams(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (active) setTeams([]); });
    return () => { active = false; };
  }, []);

  const clearFilters = () => {
    setSearchInput(""); setGenre("Бүгд"); setStatus("all"); setTeamId("all"); setSort("popular"); setPage(1);
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mx-auto w-full px-4 py-8 pb-16" style={{ maxWidth: "var(--arc-max-w)" }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          className="text-[28px] font-bold"
          style={{
            fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
            letterSpacing: "-0.03em",
            background: "linear-gradient(90deg,var(--arc-cyan),oklch(0.72 0.17 240))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}
        >
          Манхуа жагсаалт
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--arc-muted)" }}>
          Нэрээр хайх · жанраар шүүх · статус · дараалал
        </p>
      </div>

      {/* Filter bar */}
      <div
        style={{
          background: "var(--arc-card)", border: "1px solid var(--arc-border)",
          borderRadius: "var(--arc-radius-lg)", padding: 18, marginBottom: 24,
          display: "flex", flexDirection: "column", gap: 14,
        }}
      >
        {/* Search */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--arc-muted)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Хайх..."
            style={{
              width: "100%", padding: "10px 14px 10px 38px",
              background: "var(--arc-elevated)", border: "1px solid var(--arc-border)",
              borderRadius: "var(--arc-radius)", color: "var(--arc-text)", fontSize: 13, outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
          />
        </div>

        {/* Genre pills */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>Жанр</div>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                style={genre === g ? pillActive : pillBase}
                onMouseEnter={(e) => { if (genre !== g) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; } }}
                onMouseLeave={(e) => { if (genre !== g) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; } }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Status + Sort row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>Статус</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  style={status === s.value ? pillActive : pillBase}
                  onMouseEnter={(e) => { if (status !== s.value) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; } }}
                  onMouseLeave={(e) => { if (status !== s.value) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; } }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Дараалал</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                padding: "7px 12px", background: "var(--arc-elevated)",
                border: "1px solid var(--arc-border)", borderRadius: "var(--arc-radius)",
                color: "var(--arc-text)", fontSize: 12, cursor: "pointer", outline: "none",
                fontFamily: "var(--font-body,'DM Sans',sans-serif)",
              }}
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Team filter + clear */}
        {(teams.length > 0 || hasActiveFilters) && (
          <div className="flex flex-wrap items-center gap-2">
            {teams.length > 0 && (
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                style={{
                  padding: "7px 12px", background: "var(--arc-elevated)",
                  border: "1px solid var(--arc-border)", borderRadius: "var(--arc-radius)",
                  color: "var(--arc-text)", fontSize: 12, cursor: "pointer", outline: "none",
                  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
                }}
              >
                <option value="all">Бүх баг</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{ ...pillBase, borderColor: "oklch(0.65 0.22 15/.3)", color: "oklch(0.75 0.18 15)" }}
              >
                Цэвэрлэх ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-[10px] px-4 py-3 text-[13px]" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      {/* Results count */}
      {!loading && items.length > 0 && (
        <div className="mb-4 text-[12px]" style={{ color: "var(--arc-muted)" }}>
          Нийт <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{total}</span> манхуа
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {Array.from({ length: 6 }).map((_, i) => <ManhuaSkeletonHorizontal key={i} />)}
          </div>
          <div className="hidden grid-cols-2 gap-4 sm:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <ManhuaSkeleton key={i} />)}
          </div>
        </>
      ) : items.length === 0 ? (
        <div
          className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-12 text-center"
          style={{ borderRadius: "var(--arc-radius-lg)", border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          <div className="mb-4 text-[40px]" aria-hidden>📭</div>
          <h3 className="mb-2 text-[17px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Тохирох манхуа олдсонгүй
          </h3>
          <p className="text-[13px]" style={{ color: "var(--arc-muted)", maxWidth: 300 }}>Filter-ээ арилгаад дахин хайна уу.</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-5 rounded-full px-6 py-2 text-[13px] font-semibold transition hover:brightness-110"
              style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
            >
              Filter цэвэрлэх
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {items.map((m) => <ManhuaCard key={m._id} manhua={m} variant="horizontal" />)}
          </div>
          <div className="hidden grid-cols-2 gap-4 sm:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((m) => <ManhuaCard key={m._id} manhua={m} />)}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-9 flex items-center justify-center gap-2">
          <button
            disabled={!hasPrev}
            onClick={() => hasPrev && setPage((p) => p - 1)}
            className="rounded-[10px] px-5 py-2 text-[13px] font-medium transition disabled:opacity-35"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)", cursor: hasPrev ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (hasPrev) { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.17 195/.5)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)"; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-card)"; }}
          >
            ← Өмнөх
          </button>
          <span className="px-2 text-[13px]" style={{ color: "var(--arc-muted)" }}>
            Хуудас <b style={{ color: "var(--arc-text)" }}>{page}</b> / {totalPages}
          </span>
          <button
            disabled={!hasNext}
            onClick={() => hasNext && setPage((p) => p + 1)}
            className="rounded-[10px] px-5 py-2 text-[13px] font-medium transition disabled:opacity-35"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)", cursor: hasNext ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (hasNext) { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.17 195/.5)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)"; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-card)"; }}
          >
            Дараах →
          </button>
        </div>
      )}
    </div>
  );
}
