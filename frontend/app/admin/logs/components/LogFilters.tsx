"use client";

import { useState, useEffect } from "react";

export interface LogFilters {
  search: string;
  level: string;
  category: string;
  action: string;
  dateRange: string;
  from?: string;
  to?: string;
}

interface LogFiltersProps {
  filters: LogFilters;
  onFiltersChange: (filters: LogFilters) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

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

export default function LogFilters({
  filters,
  onFiltersChange,
  onClear,
  hasActiveFilters,
}: LogFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    onFiltersChange({ ...filters, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };

    // Handle date range
    if (key === "dateRange") {
      if (value === "all") {
        newFilters.from = undefined;
        newFilters.to = undefined;
      } else {
        const now = new Date();
        if (value === "24h") {
          const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          newFilters.from = from.toISOString();
          newFilters.to = undefined;
        } else if (value === "7d") {
          const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          newFilters.from = from.toISOString();
          newFilters.to = undefined;
        } else if (value === "30d") {
          const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          newFilters.from = from.toISOString();
          newFilters.to = undefined;
        }
      }
    }

    onFiltersChange(newFilters);
  };

  const levelOptions = [
    { value: "all", label: "Бүгд" },
    { value: "INFO", label: "INFO" },
    { value: "WARN", label: "WARN" },
    { value: "ERROR", label: "ERROR" },
  ];

  const categoryOptions = [
    { value: "all", label: "Бүгд" },
    { value: "auth", label: "Auth" },
    { value: "device", label: "Device" },
    { value: "payment", label: "Payment" },
    { value: "content", label: "Content" },
    { value: "reader", label: "Reader" },
    { value: "comment", label: "Comment" },
    { value: "admin", label: "Admin" },
    { value: "system", label: "System" },
  ];

  const dateRangeOptions = [
    { value: "all", label: "Бүгд" },
    { value: "24h", label: "Сүүлийн 24 цаг" },
    { value: "7d", label: "Сүүлийн 7 хоног" },
    { value: "30d", label: "Сүүлийн 30 хоног" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
      {/* Search Input */}
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
          placeholder="Хайх (message, action, user, IP, path)..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Level Filter */}
        <div className="flex-1 sm:max-w-[140px]">
          <select
            value={filters.level}
            onChange={(e) => handleFilterChange("level", e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            {levelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex-1 sm:max-w-[140px]">
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {dateRangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange("dateRange", opt.value)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                filters.dateRange === opt.value
                  ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-300"
                  : "border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 sm:px-6"
          >
            Цэвэрлэх
          </button>
        )}
      </div>
    </div>
  );
}
