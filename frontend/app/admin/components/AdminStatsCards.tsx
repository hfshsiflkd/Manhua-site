interface AdminStats {
  totalUsers: number;
  totalVIP: number;
  totalManhuas: number;
  totalChapters: number;
  views?: number;
}

const CARDS = [
  {
    key: "totalUsers" as const,
    label: "Нийт хэрэглэгч",
    color: "var(--arc-cyan)",
    bg: "oklch(0.72 0.17 195/.1)",
    border: "oklch(0.72 0.17 195/.25)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: "totalVIP" as const,
    label: "VIP гишүүд",
    color: "var(--arc-amber)",
    bg: "oklch(0.82 0.16 85/.1)",
    border: "oklch(0.82 0.16 85/.25)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    key: "totalManhuas" as const,
    label: "Нийт манхуа",
    color: "oklch(0.8 0.14 155)",
    bg: "oklch(0.72 0.17 155/.1)",
    border: "oklch(0.72 0.17 155/.25)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    key: "totalChapters" as const,
    label: "Нийт chapter",
    color: "oklch(0.8 0.16 290)",
    bg: "oklch(0.65 0.2 290/.1)",
    border: "oklch(0.65 0.2 290/.25)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
];

export default function AdminStatsCards({ stats }: { stats: AdminStats }) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ key, label, color, bg, border, icon }) => (
          <div
            key={key}
            className="rounded-[14px] p-4 flex flex-col gap-2.5"
            style={{ border: `1px solid var(--arc-border)`, background: "var(--arc-card)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em]" style={{ color: "var(--arc-muted)" }}>{label}</span>
              <div className="flex items-center justify-center rounded-[9px]" style={{ width: 32, height: 32, background: bg, color, border: `1px solid ${border}` }}>
                {icon}
              </div>
            </div>
            <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff", letterSpacing: "-0.03em" }}>
              {(stats[key] ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </section>

      {typeof stats.views === "number" && (
        <section className="rounded-[14px] p-4 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em]" style={{ color: "var(--arc-muted)" }}>Нийт уншсан тоо (views)</p>
          <p className="mt-2 text-[24px] font-bold leading-none" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{stats.views.toLocaleString("en-US")}</p>
        </section>
      )}
    </>
  );
}
