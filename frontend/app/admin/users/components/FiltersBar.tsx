"use client";

type Filters = {
  q: string;
  role: "all" | "user" | "translator" | "admin" | "editor";
  vip: "all" | "true" | "false";
  blocked: "all" | "true" | "false";
};

export default function FiltersBar({
  filters,
  onChange,
  onRefresh,
  page,
  totalPages,
  onPageChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onRefresh: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <input
          className="w-64 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
          placeholder="Search name/email/phone..."
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onRefresh()}
        />
        <select
          className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
          value={filters.role}
          onChange={(e) => onChange({ ...filters, role: e.target.value as Filters["role"] })}
        >
          <option value="all">All roles</option>
          <option value="user">User</option>
          <option value="translator">Translator</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
          value={filters.vip}
          onChange={(e) => onChange({ ...filters, vip: e.target.value as Filters["vip"] })}
        >
          <option value="all">VIP: all</option>
          <option value="true">VIP only</option>
          <option value="false">Non-VIP</option>
        </select>
        <select
          className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
          value={filters.blocked}
          onChange={(e) => onChange({ ...filters, blocked: e.target.value as Filters["blocked"] })}
        >
          <option value="all">Blocked: all</option>
          <option value="true">Blocked</option>
          <option value="false">Active</option>
        </select>
        <button
          onClick={onRefresh}
          className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition"
        >
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-xs text-slate-400">
          Page {page} / {totalPages || 1}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

