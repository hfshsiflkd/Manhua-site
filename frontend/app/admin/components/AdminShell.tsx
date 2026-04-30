"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: Array<{ href?: string; label: string; section?: boolean }> = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/leaderboard", label: "Leaderboard" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/requests", label: "Reader Requests" },
  { href: "/admin/logs", label: "Activity Logs" },
  { section: true, label: "Content" },
  { href: "/admin/manhuas", label: "Manhuas" },
  { section: true, label: "Settings" },
  { href: "/admin/settings/trial", label: "Trial Settings" },
  { href: "/admin/settings/vip", label: "VIP Settings" },
];

type AdminShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export default function AdminShell({ children, title, subtitle }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const headerTitle = title || "Admin Dashboard";
  const headerSubtitle = subtitle || "Manage users, content and logs in one place.";

  const shortLabel = (label: string) =>
    label.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 3).toUpperCase();

  return (
    <div className="min-h-screen w-full flex" style={{ background: "var(--arc-bg)", color: "var(--arc-text)" }}>
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col transition-all duration-200 ${collapsed ? "w-16" : "w-[220px]"}`}
        style={{ borderRight: "1px solid var(--arc-border)", background: "var(--arc-sidebar, #09090f)", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid var(--arc-border)" }}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center rounded-[8px]" style={{ width: 30, height: 30, background: "var(--arc-elevated)", border: "1px solid var(--arc-border)" }}>
                <svg viewBox="0 0 48 48" width="16" height="16" fill="none">
                  <path d="M8 28 C14 14 34 14 40 28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
                  <path d="M16 34 C20 30 28 30 32 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="24" cy="12" r="3" fill="var(--arc-rose)"/>
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-bold tracking-tight" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
                  ARC<span style={{ color: "var(--arc-rose)" }}>•</span>READ
                </div>
                <div className="text-[9px] font-bold tracking-[0.08em] uppercase" style={{ color: "var(--arc-amber)" }}>Admin Panel</div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-[7px] px-2 py-1 text-[10px] font-semibold transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            if (item.section) {
              if (collapsed) return null;
              return (
                <div key={item.label} className="px-2 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--arc-muted)" }}>
                  {item.label}
                </div>
              );
            }
            const href = item.href as string;
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={item.label}
                className={`flex items-center rounded-[10px] py-2 text-[13px] font-medium transition-colors ${collapsed ? "justify-center px-2" : "px-2.5"}`}
                style={{
                  background: active ? "oklch(0.72 0.17 195/.1)" : "transparent",
                  color: active ? "var(--arc-cyan)" : "var(--arc-dim)",
                  border: active ? "1px solid oklch(0.72 0.17 195/.25)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.04)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; } }}
                onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; } }}
              >
                {collapsed ? (
                  <span className="text-[11px] font-semibold">{shortLabel(item.label)}</span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-3" style={{ borderTop: "1px solid var(--arc-border)" }}>
            <div className="flex items-center justify-center rounded-[8px] shrink-0 text-[12px] font-bold" style={{ width: 30, height: 30, background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))", color: "#07070e", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>A</div>
            <div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--arc-text)" }}>Admin</div>
              <div className="text-[10px]" style={{ color: "var(--arc-muted)" }}>Administrator</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
        <header
          className="flex items-center justify-between px-6 sticky top-0 z-50"
          style={{ height: 52, borderBottom: "1px solid var(--arc-border)", background: "rgba(7,7,14,.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="text-[15px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{headerTitle}</div>
          <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{new Date().toLocaleDateString("mn-MN")}</div>
        </header>

        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
