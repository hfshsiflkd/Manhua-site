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

  const selectStyle: React.CSSProperties = {
    width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
    background: "var(--arc-elevated)", padding: "9px 16px", fontSize: 13,
    color: "var(--arc-text)", outline: "none",
  };

  return (
    <div className="space-y-4 rounded-[14px] p-4 sm:p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--arc-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Хайх (message, action, user, IP, path)..."
          className="w-full pl-10 pr-4 py-2.5 text-[13px] rounded-[9px] outline-none"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 sm:max-w-[140px]">
          <select value={filters.level} onChange={(e) => handleFilterChange("level", e.target.value)} style={selectStyle}>
            {levelOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="flex-1 sm:max-w-[140px]">
          <select value={filters.category} onChange={(e) => handleFilterChange("category", e.target.value)} style={selectStyle}>
            {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {dateRangeOptions.map((opt) => (
            <button key={opt.value} onClick={() => handleFilterChange("dateRange", opt.value)}
              className="flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
              style={filters.dateRange === opt.value
                ? { border: "1px solid oklch(0.72 0.17 195/.6)", background: "oklch(0.72 0.17 195/.15)", color: "var(--arc-cyan)", cursor: "pointer" }
                : { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}>
              {opt.label}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button onClick={onClear} className="rounded-[9px] px-4 py-2.5 text-[13px] font-medium transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}>
            Цэвэрлэх
          </button>
        )}
      </div>
    </div>
  );
}
