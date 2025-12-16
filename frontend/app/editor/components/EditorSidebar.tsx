"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface EditorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}

export default function EditorSidebar({
  isOpen,
  onClose,
  pathname,
}: EditorSidebarProps) {
  const { user } = useAuth();

  const navItems = [
    {
      href: "/editor/manhuas",
      label: "My Manhuas",
      icon: "📚",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/editor/manhuas") {
      return pathname === href || pathname.startsWith("/editor/manhuas/");
    }
    return pathname === href;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-sm lg:flex">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
            <span className="text-lg">✏️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate">
              Editor Dashboard
            </h2>
            <p className="text-[10px] text-slate-400 truncate">
              {user?.username || "Editor"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-slate-900/50 hover:text-slate-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Нүүр хуудас</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-sm transition-transform duration-300 lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
              <span className="text-lg">✏️</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Editor</h2>
              <p className="text-[10px] text-slate-400">{user?.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-slate-900/50 hover:text-slate-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Нүүр хуудас</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

