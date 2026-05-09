"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavStats {
  totalManhuas?: number;
  totalUsers?: number;
  totalVIP?: number;
}

const DashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const ManhuaIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
  </svg>
);
const VIPIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const RequestsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const LogIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const FeedbackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
  </svg>
);
const ArcMark = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" fill="none">
    <path d="M8 28 C14 14 34 14 40 28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M16 34 C20 30 28 30 32 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="24" cy="12" r="3" fill="var(--arc-rose)"/>
  </svg>
);

function formatBadge(n?: number): string | null {
  if (n == null) return null;
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

type AdminShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  stats?: NavStats;
};

export default function AdminShell({ children, title, stats }: AdminShellProps) {
  // subtitle accepted for compatibility but rendered per-page in content area
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const headerTitle = title || "Admin dashboard";

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  const NavItem = ({
    href,
    label,
    icon,
    badge,
  }: {
    href: string;
    label: string;
    icon: ReactNode;
    badge?: string | null;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        title={label}
        className="flex items-center rounded-[10px] py-2 text-[13px] font-medium transition-colors"
        style={{
          gap: collapsed ? 0 : 10,
          padding: collapsed ? "8px" : "8px 10px",
          justifyContent: collapsed ? "center" : "flex-start",
          background: active ? "oklch(0.72 0.17 195/.1)" : "transparent",
          color: active ? "var(--arc-cyan)" : "var(--arc-dim)",
          border: active ? "1px solid oklch(0.72 0.17 195/.2)" : "1px solid transparent",
          opacity: active ? 1 : 0.85,
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.04)";
            (e.currentTarget as HTMLElement).style.color = "var(--arc-text)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)";
          }
        }}
      >
        <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && badge && (
          <span style={{
            marginLeft: "auto",
            fontSize: 10,
            fontWeight: 700,
            background: "oklch(0.72 0.17 195/.1)",
            color: "var(--arc-cyan)",
            padding: "1px 6px",
            borderRadius: 4,
          }}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => {
    if (collapsed) return <div style={{ height: 1, margin: "8px 4px", background: "var(--arc-border)" }} />;
    return (
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--arc-muted)", padding: "10px 8px 4px", marginTop: 4 }}>
        {label}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: "var(--arc-bg)", color: "var(--arc-text)" }}>
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col transition-all duration-200 ${collapsed ? "w-16" : "w-[220px]"}`}
        style={{ borderRight: "1px solid var(--arc-border)", background: "#09090f", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between" style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--arc-border)" }}>
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
              <div className="flex items-center justify-center rounded-[8px]" style={{ width: 30, height: 30, background: "var(--arc-elevated)", border: "1px solid var(--arc-border)" }}>
                <ArcMark />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--arc-text)" }}>
                  ARC<span style={{ color: "var(--arc-rose)" }}>•</span>READ
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--arc-amber)", marginTop: 1 }}>
                  Admin Panel
                </div>
              </div>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="rounded-[7px] px-2 py-1 text-[10px] font-semibold transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <SectionLabel label="Ерөнхий" />
          <NavItem href="/admin" label="Dashboard" icon={<DashIcon />} />

          <SectionLabel label="Контент" />
          <NavItem href="/admin/manhuas" label="Манхуа" icon={<ManhuaIcon />} badge={formatBadge(stats?.totalManhuas)} />
          <NavItem href="/admin/users" label="Хэрэглэгч" icon={<UsersIcon />} badge={formatBadge(stats?.totalUsers)} />
          <NavItem href="/admin/finance" label="VIP" icon={<VIPIcon />} badge={formatBadge(stats?.totalVIP)} />
          <NavItem href="/admin/requests" label="Хүсэлт" icon={<RequestsIcon />} />

          <SectionLabel label="Систем" />
          <NavItem href="/admin/logs" label="Лог" icon={<LogIcon />} />
          <NavItem href="/admin/feedback" label="Feedback" icon={<FeedbackIcon />} />
          <NavItem href="/admin/trash" label="Сагс" icon={<TrashIcon />} />
          <NavItem href="/admin/settings/vip" label="Тохиргоо" icon={<SettingsIcon />} />
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-3" style={{ borderTop: "1px solid var(--arc-border)" }}>
            <div className="flex items-center justify-center rounded-[8px] shrink-0 text-[12px] font-bold" style={{ width: 30, height: 30, background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))", color: "#07070e", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>A</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--arc-text)", lineHeight: 1.2 }}>Админ</div>
              <div style={{ fontSize: 10, color: "var(--arc-muted)" }}>Administrator</div>
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
          <div style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontSize: 15, fontWeight: 700, color: "var(--arc-text)" }}>
            {headerTitle}
          </div>
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: 12, color: "var(--arc-muted)" }}>
              {new Date().toLocaleDateString("mn-MN")}
            </span>
            <button
              type="button"
              onClick={() => router.push("/admin/manhuas/new")}
              style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-text)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "border-color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.12)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)")}
            >
              + Манхуа нэмэх
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/finance")}
              style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid oklch(0.82 0.16 85/.3)", background: "transparent", color: "var(--arc-amber)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "border-color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "oklch(0.82 0.16 85/.5)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "oklch(0.82 0.16 85/.3)")}
            >
              ⭐ VIP шалгах
            </button>
          </div>
        </header>

        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
