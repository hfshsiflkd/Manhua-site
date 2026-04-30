/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import AdminShell from "../components/AdminShell";
import { adminGetAuditLogs, AuditLog } from "@/lib/api";
import LogFilters, { LogFilters as LogFiltersType } from "./components/LogFilters";
import LogRow from "./components/LogRow";
import LogCard from "./components/LogCard";
import { LogRowSkeleton, LogCardSkeleton } from "./components/LogSkeleton";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFiltersType>({
    search: "",
    level: "all",
    category: "all",
    action: "",
    dateRange: "all",
  });

  const hasActiveFilters = useMemo(
    () =>
      filters.search !== "" ||
      filters.level !== "all" ||
      filters.category !== "all" ||
      filters.action !== "" ||
      filters.dateRange !== "all",
    [filters]
  );

  async function loadLogs() {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
      };

      if (filters.search && filters.search.trim()) params.q = filters.search.trim();
      if (filters.level && filters.level !== "all") params.level = filters.level;
      if (filters.category && filters.category !== "all") params.category = filters.category;
      if (filters.action && filters.action.trim()) params.action = filters.action.trim();
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await adminGetAuditLogs(params);
      setLogs(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  // Load logs when filters or page change
  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
  }, [filters.level, filters.category, filters.action, filters.dateRange]);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.level, filters.category, filters.action, filters.from, filters.to, filters.search]);

  const handleClearFilters = () => {
    setFilters({
      search: "",
      level: "all",
      category: "all",
      action: "",
      dateRange: "all",
    });
    setPage(1);
  };

  return (
    <AdminShell
      title="Logs"
      subtitle="БҮХ хийсэн үйлдлийн лог (full audit trail)"
    >
      <div className="space-y-6">
        {/* Filters */}
        <LogFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--arc-muted)" }}>
            <span>
              Нийт <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{total}</span> log
            </span>
            {totalPages > 1 && (
              <span>
                • Хуудас <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{page}</span> /{" "}
                {totalPages}
              </span>
            )}
          </div>
          <button
            onClick={loadLogs}
            className="rounded-[9px] px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            Шинэчлэх
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[9px] px-4 py-3 text-[13px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
            {error}
          </div>
        )}

        {/* Loading / List */}
        {loading ? (
          <>
            {/* Desktop Table Skeleton */}
            <div className="hidden md:block overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12px]">
                  <thead style={{ background: "var(--arc-elevated)", borderBottom: "1px solid var(--arc-border)" }}>
                    <tr>
                      {["Level", "Time", "Category/Action", "Message", "Actor", "IP/Path", "Details"].map((h) => (
                        <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide${h === "Details" ? " text-center" : ""}`} style={{ color: "var(--arc-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <LogRowSkeleton key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card Skeleton */}
            <div className="md:hidden space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <LogCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : logs.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[14px] px-6 py-12 text-center" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="mb-4 text-5xl">📭</div>
            <h3 className="mb-2 text-[17px] font-bold" style={{ color: "var(--arc-text)" }}>Log олдсонгүй</h3>
            <p className="mb-6 max-w-md text-[13px]" style={{ color: "var(--arc-muted)" }}>
              {hasActiveFilters ? "Filter-ээ арилгаад дахин хайна уу." : "Одоогоор log байхгүй байна."}
            </p>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all hover:brightness-110"
                style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}>
                Filter цэвэрлэх
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-[14px] max-h-[70vh]" style={{ border: "1px solid var(--arc-border)" }}>
              <div className="overflow-y-auto">
                <table className="min-w-full text-[12px]">
                  <thead className="sticky top-0 z-10" style={{ background: "var(--arc-elevated)", borderBottom: "1px solid var(--arc-border)" }}>
                    <tr>
                      {["Level", "Time", "Category/Action", "Message", "Actor", "IP/Path", "Details"].map((h) => (
                        <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide${h === "Details" ? " text-center" : ""}`} style={{ color: "var(--arc-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <LogRow key={log._id} log={log} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {logs.map((log) => (
                <LogCard key={log._id} log={log} />
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-[12px]" style={{ color: "var(--arc-dim)" }}>
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[40px] rounded-[9px] px-4 py-2 text-[13px] font-medium transition-opacity disabled:opacity-40"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}>
              ← Өмнөх
            </button>
            <span className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
              Хуудас <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{page}</span> / {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[40px] rounded-[9px] px-4 py-2 text-[13px] font-medium transition-opacity disabled:opacity-40"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}>
              Дараах →
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
