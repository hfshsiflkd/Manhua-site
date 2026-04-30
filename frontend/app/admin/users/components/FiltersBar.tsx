"use client";

const inputStyle: React.CSSProperties = {
  borderRadius: 9, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)",
  padding: "8px 12px", fontSize: 12, color: "var(--arc-text)", outline: "none",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
};

type Filters = {
  q: string;
  role: "all" | "user" | "translator" | "admin" | "editor";
  vip: "all" | "true" | "false";
  blocked: "all" | "true" | "false";
  locked: "all" | "true" | "false";
};

export default function FiltersBar({
  filters, onChange, onRefresh, page, totalPages, onPageChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onRefresh: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search + controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 280 }}>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--arc-muted)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            style={{ ...inputStyle, width: "100%", paddingLeft: 34 }}
            placeholder="Нэр, имэйл хайх..."
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onRefresh()}
            onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
          />
        </div>

        <select style={inputStyle} value={filters.role} onChange={(e) => onChange({ ...filters, role: e.target.value as Filters["role"] })}>
          <option value="all">Бүх role</option>
          <option value="user">User</option>
          <option value="translator">Translator</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>

        <select style={inputStyle} value={filters.vip} onChange={(e) => onChange({ ...filters, vip: e.target.value as Filters["vip"] })}>
          <option value="all">VIP: Бүгд</option>
          <option value="true">VIP-тэй</option>
          <option value="false">VIP-гүй</option>
        </select>

        <select style={inputStyle} value={filters.blocked} onChange={(e) => onChange({ ...filters, blocked: e.target.value as Filters["blocked"] })}>
          <option value="all">Blocked: Бүгд</option>
          <option value="true">Blocked</option>
          <option value="false">Active</option>
        </select>

        <select style={inputStyle} value={filters.locked} onChange={(e) => onChange({ ...filters, locked: e.target.value as Filters["locked"] })}>
          <option value="all">Locked: Бүгд</option>
          <option value="true">Locked</option>
          <option value="false">Нээлттэй</option>
        </select>

        <button
          onClick={onRefresh}
          className="rounded-[9px] px-3 py-2 text-[12px] font-medium transition-opacity hover:opacity-80"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Pagination row */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-[8px] px-3 py-1.5 text-[12px] font-medium disabled:opacity-35 transition-all"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)", cursor: page > 1 ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (page > 1) { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.17 195/.5)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)"; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-card)"; }}
          >
            ← Өмнөх
          </button>
          <span className="text-[12px] px-1" style={{ color: "var(--arc-muted)" }}>
            Хуудас <b style={{ color: "var(--arc-text)" }}>{page}</b> / {totalPages || 1}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-[8px] px-3 py-1.5 text-[12px] font-medium disabled:opacity-35 transition-all"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)", cursor: page < totalPages ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (page < totalPages) { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.17 195/.5)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)"; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-card)"; }}
          >
            Дараах →
          </button>
        </div>
      )}
    </div>
  );
}
