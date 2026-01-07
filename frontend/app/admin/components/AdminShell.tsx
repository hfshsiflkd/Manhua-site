// src/components/admin/AdminShell.tsx
"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/leaderboard", label: "Leaderboard" },
  { href: "/admin/logs", label: "Activity Logs" },
  { href: "/admin/manhuas", label: "Manhuas" },
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

  const headerTitle = title || "Admin Dashboard";
  const headerSubtitle =
    subtitle || "Manage users, content and logs in one place.";

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900/80">
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Manhua Admin
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dashboard &amp; controls
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition
                ${
                  active
                    ? "bg-slate-800 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-cyan-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          Logged in as <span className="text-slate-300">Admin</span>
        </div>
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
