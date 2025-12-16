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
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              Нийт <span className="font-semibold text-slate-300">{total}</span> log
            </span>
            {totalPages > 1 && (
              <span>
                • Хуудас <span className="font-semibold text-slate-300">{page}</span> /{" "}
                {totalPages}
              </span>
            )}
          </div>
          <button
            onClick={loadLogs}
            className="inline-flex items-center rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition"
          >
            Шинэчлэх
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Loading / List */}
        {loading ? (
          <>
            {/* Desktop Table Skeleton */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur shadow-xl shadow-black/40">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-950/90 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Level
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Category/Action
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Actor
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        IP/Path
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400">
                        Details
                      </th>
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
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-12 text-center">
            <div className="mb-4 text-5xl">📭</div>
            <h3 className="mb-2 text-lg font-semibold text-slate-100">Log олдсонгүй</h3>
            <p className="mb-6 max-w-md text-sm text-slate-400">
              {hasActiveFilters
                ? "Filter-ээ арилгаад дахин хайна уу."
                : "Одоогоор log байхгүй байна."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 transition hover:brightness-110"
              >
                Filter цэвэрлэх
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur shadow-xl shadow-black/40 max-h-[70vh]">
              <div className="overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-950/90 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Level
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Category/Action
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        Actor
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                        IP/Path
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400">
                        Details
                      </th>
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
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-500/60 hover:bg-slate-800 sm:px-6"
            >
              ← Өмнөх
            </button>
            <span className="text-xs sm:text-sm">
              Хуудас <span className="font-semibold">{page}</span> / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-500/60 hover:bg-slate-800 sm:px-6"
            >
              Дараах →
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
