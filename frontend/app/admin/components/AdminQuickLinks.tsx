"use client";

import Link from "next/link";

const links = [
  {
    href: "/admin/manhuas", title: "Манхуа", desc: "Нэмэх, засах, статус өөрчлөх.",
    color: "var(--arc-cyan)", bg: "oklch(0.72 0.17 195/.1)", border: "oklch(0.72 0.17 195/.25)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
  {
    href: "/admin/users", title: "Хэрэглэгч", desc: "Role тохируулах, VIP удирдах.",
    color: "oklch(0.8 0.14 155)", bg: "oklch(0.72 0.17 155/.1)", border: "oklch(0.72 0.17 155/.25)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  },
  {
    href: "/admin/finance", title: "VIP & Finance", desc: "Salary distribution, VIP идэвхжилт.",
    color: "var(--arc-amber)", bg: "oklch(0.82 0.16 85/.1)", border: "oklch(0.82 0.16 85/.25)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  },
  {
    href: "/admin/requests", title: "Хүсэлт", desc: "Санал, хүсэлт шалгах.",
    color: "oklch(0.8 0.16 290)", bg: "oklch(0.65 0.2 290/.1)", border: "oklch(0.65 0.2 290/.25)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    href: "/admin/logs", title: "Лог", desc: "Системийн үйлдлийн лог.",
    color: "var(--arc-rose)", bg: "oklch(0.65 0.22 15/.1)", border: "oklch(0.65 0.22 15/.25)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    href: "/admin/feedback", title: "Санал хүсэлт", desc: "Хэрэглэгчийн feedback.",
    color: "var(--arc-dim)", bg: "rgba(255,255,255,.05)", border: "var(--arc-border)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  },
  {
    href: "/editor/leaderboard", title: "Leaderboard", desc: "Editors rank & payout.",
    color: "var(--arc-amber)", bg: "oklch(0.82 0.16 85/.08)", border: "oklch(0.82 0.16 85/.2)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  },
  {
    href: "/admin/settings/vip", title: "Тохиргоо", desc: "VIP систем тохируулах.",
    color: "var(--arc-dim)", bg: "rgba(255,255,255,.04)", border: "var(--arc-border)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  },
];

export default function AdminQuickLinks() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-[3px] h-4 rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px oklch(0.72 0.17 195/.2)" }} />
        <span className="text-[14px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Хурдан нэвтрэх</span>
      </div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {links.map(({ href, title, desc, color, bg, border, icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-[14px] p-4 flex flex-col gap-2 transition-all"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border-h, rgba(255,255,255,.12))"; (e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.background = "var(--arc-card)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
          >
            <div className="flex items-center justify-center rounded-[9px] w-9 h-9" style={{ background: bg, color, border: `1px solid ${border}` }}>
              {icon}
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{title}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--arc-muted)" }}>{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
