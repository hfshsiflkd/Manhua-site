// src/components/admin/AdminShell.tsx
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

export default function AdminShell({
  children,
  title,
  subtitle,
}: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const headerTitle = title || "Admin Dashboard";
  const headerSubtitle =
    subtitle || "Manage users, content and logs in one place.";

  const shortLabel = (label: string) =>
    label
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900/80 transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div
            className={`text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 transition-opacity ${
              collapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            Admin
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-800"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            if (item.section) {
              if (collapsed) return null;
              return (
                <div
                  key={item.label}
                  className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500"
                >
                  {item.label}
                </div>
              );
            }
            const href = item.href as string;
            const active =
              pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={item.label}
                className={`flex items-center rounded-lg py-2 text-[15px] font-medium transition ${
                  collapsed ? "justify-center px-2" : "px-3"
                } ${
                  active
                    ? collapsed
                      ? "bg-slate-800/80 text-cyan-200"
                      : "border-l-2 border-cyan-400 bg-slate-800/80 pl-2 text-cyan-200"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-cyan-200"
                }`}
              >
                {collapsed ? (
                  <span className="text-[13px] font-semibold text-slate-200">
                    {shortLabel(item.label)}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </nav>
        {!collapsed && (
          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
            Logged in as <span className="text-slate-300">Admin</span>
          </div>
        )}
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col">
        <header className="border-b border-slate-800 px-4 md:px-8 py-4 bg-slate-950/80 backdrop-blur flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-semibold">{headerTitle}</h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              {headerSubtitle}
            </p>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
