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

const pill: React.CSSProperties = {
  padding: "5px 13px", borderRadius: 20,
  border: "1px solid var(--arc-border)", background: "transparent",
  color: "var(--arc-dim)", fontSize: 12, fontWeight: 500,
  cursor: "pointer", whiteSpace: "nowrap",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  transition: "all .15s",
};

const pillOn: React.CSSProperties = {
  ...pill,
  borderColor: "oklch(0.72 0.17 195/.5)",
  background: "oklch(0.72 0.17 195/.1)",
  color: "var(--arc-cyan)",
};

const pagBtn: React.CSSProperties = {
  padding: "8px 20px", borderRadius: 10,
  background: "var(--arc-card)", border: "1px solid var(--arc-border)",
  color: "var(--arc-text)", fontSize: 13, fontWeight: 500,
  cursor: "pointer", fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  transition: "border-color .15s, background .15s",
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
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);
  const hasActiveFilters = debouncedSearch !== "" || genre !== "Бүгд" || status !== "all" || teamId !== "all";

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
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
  }, [page, genre, status, teamId, sort, debouncedSearch]);

  useEffect(() => { setPage(1); }, [debouncedSearch, genre, status, teamId, sort]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    api.get<TeamOption[]>("/manhuas/teams")
      .then((res) => { if (active) setTeams(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const clearFilters = () => { setSearchInput(""); setGenre("Бүгд"); setStatus("all"); setTeamId("all"); setSort("popular"); setPage(1); };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div style={{ maxWidth: "var(--arc-max-w)", margin: "0 auto", padding: "36px 24px 60px" }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
          fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em",
          background: "linear-gradient(90deg,var(--arc-cyan),oklch(0.72 0.17 240))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Манхуа жагсаалт
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--arc-muted)" }}>
          Нэрээр хайх · жанраар шүүх · статус · дараалал
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ background: "var(--arc-card)", border: "1px solid var(--arc-border)", borderRadius: 14, padding: 18, marginBottom: 24, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--arc-muted)", pointerEvents: "none" }}>
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
              borderRadius: 10, color: "var(--arc-text)", fontSize: 13, outline: "none",
              fontFamily: "var(--font-body,'DM Sans',sans-serif)", transition: "border-color .15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
          />
        </div>

        {/* Genre row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--arc-muted)", whiteSpace: "nowrap" }}>Жанр</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                style={genre === g ? pillOn : pill}
                onMouseEnter={(e) => { if (genre !== g) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; } }}
                onMouseLeave={(e) => { if (genre !== g) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; } }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Status + Sort row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--arc-muted)", whiteSpace: "nowrap" }}>Статус</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  style={status === s.value ? pillOn : pill}
                  onMouseEnter={(e) => { if (status !== s.value) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; } }}
                  onMouseLeave={(e) => { if (status !== s.value) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; } }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--arc-muted)" }}>Дараалал</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ padding: "8px 12px", background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", borderRadius: 10, color: "var(--arc-text)", fontSize: 12, cursor: "pointer", outline: "none", fontFamily: "var(--font-body,'DM Sans',sans-serif)" }}
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Team filter */}
        {teams.length > 0 && (
          <div>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              style={{ padding: "8px 12px", background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", borderRadius: 10, color: "var(--arc-text)", fontSize: 12, cursor: "pointer", outline: "none", fontFamily: "var(--font-body,'DM Sans',sans-serif)" }}
            >
              <option value="all">Бүх баг</option>
              {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, borderRadius: 10, padding: "12px 16px", fontSize: 13, background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      {/* Results info */}
      {!loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "var(--arc-muted)" }}>
            Нийт <b style={{ color: "var(--arc-text)" }}>{total}</b> манхуа · хуудас <b style={{ color: "var(--arc-text)" }}>{page}</b>/{totalPages}
          </span>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ ...pill, fontSize: 11 }}>✕ Цэвэрлэх</button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {Array.from({ length: 6 }).map((_, i) => <ManhuaSkeletonHorizontal key={i} />)}
          </div>
          <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" style={{ gap: 16 }}>
            {Array.from({ length: 10 }).map((_, i) => <ManhuaSkeleton key={i} />)}
          </div>
        </>
      ) : items.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", border: "1px solid var(--arc-border)", borderRadius: 14, background: "var(--arc-card)" }}>
          <div style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontSize: 17, fontWeight: 600, color: "var(--arc-text)", marginBottom: 8 }}>
            Тохирох манхуа олдсонгүй
          </div>
          <p style={{ fontSize: 13, color: "var(--arc-muted)", maxWidth: 300 }}>Filter-ээ арилгаад дахин хайна уу.</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{ marginTop: 20, padding: "8px 22px", borderRadius: 20, background: "var(--arc-cyan)", color: "#07070e", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "var(--font-body,'DM Sans',sans-serif)" }}
            >
              Filter цэвэрлэх
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: horizontal */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {items.map((m) => <ManhuaCard key={m._id} manhua={m} variant="horizontal" />)}
          </div>
          {/* Desktop: grid */}
          <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" style={{ gap: 16 }}>
            {items.map((m) => <ManhuaCard key={m._id} manhua={m} />)}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 36, flexWrap: "wrap" }}>
          <button
            disabled={!hasPrev}
            onClick={() => hasPrev && setPage((p) => p - 1)}
            style={{ ...pagBtn, opacity: hasPrev ? 1 : 0.35, cursor: hasPrev ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (hasPrev) { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.17 195/.5)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)"; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-card)"; }}
          >
            ← Өмнөх
          </button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            const isActive = pg === page;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                style={{
                  ...pagBtn, padding: "8px 16px",
                  borderColor: isActive ? "oklch(0.72 0.17 195/.5)" : "var(--arc-border)",
                  background: isActive ? "oklch(0.72 0.17 195/.1)" : "var(--arc-card)",
                  color: isActive ? "var(--arc-cyan)" : "var(--arc-text)",
                }}
                onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.17 195/.5)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)"; } }}
                onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-card)"; } }}
              >
                {pg}
              </button>
            );
          })}

          <button
            disabled={!hasNext}
            onClick={() => hasNext && setPage((p) => p + 1)}
            style={{ ...pagBtn, opacity: hasNext ? 1 : 0.35, cursor: hasNext ? "pointer" : "default" }}
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
