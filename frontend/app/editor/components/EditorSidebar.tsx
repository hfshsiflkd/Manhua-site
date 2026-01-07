"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { editorGetLeaderboard, LeaderboardRow } from "@/lib/editorLeaderboard";
import { useEffect, useMemo, useState } from "react";

interface EditorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}

function formatMoney(n: number, currency: string) {
  const v = Number(n || 0);
  return `${v.toLocaleString("en-US")} ${currency}`;
}

export default function EditorSidebar({
  isOpen,
  onClose,
  pathname,
}: EditorSidebarProps) {
  const { user } = useAuth();

  const roleNorm = String(user?.role || "").toLowerCase().trim();
  const isAdmin = roleNorm === "admin";
  const isEditor = roleNorm === "editor"; // translators should NOT see leaderboard

  const navItems = [
    {
      href: "/editor/manhuas",
      label: "My Manhuas",
      icon: "📚",
    },
  ];
  if (isAdmin || isEditor) {
    navItems.push({
      href: "/editor/leaderboard",
      label: "Leaderboard",
      icon: "🏆",
    });
  }

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
        <nav className="space-y-1 px-3 py-4">
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

        {(isAdmin || isEditor) && <LeaderboardPanel />}

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
        <nav className="space-y-1 px-3 py-4">
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

        {(isAdmin || isEditor) && (
          <div className="px-3 pb-4">
            <LeaderboardPanel />
          </div>
        )}

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

  function LeaderboardPanel() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [month, setMonth] = useState(defaultMonth);
    const [rows, setRows] = useState<LeaderboardRow[]>([]);
    const [currency, setCurrency] = useState("MNT");
    const [editorsPool, setEditorsPool] = useState(0);
    const [loading, setLoading] = useState(false);

    const top = useMemo(() => rows.slice(0, 5), [rows]);

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      editorGetLeaderboard({ month })
        .then((res) => {
          if (cancelled) return;
          setRows(res.editors || []);
          setCurrency(res.currency || "MNT");
          setEditorsPool(Number(res.editorsPool || 0));
        })
        .catch(() => {
          if (cancelled) return;
          setRows([]);
          setEditorsPool(0);
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [month]);

    return (
      <section className="mx-3 mb-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-200">🏆 Leaderboard</div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[120px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div className="mt-2 text-[11px] text-slate-400">
          Editors pool: <b className="text-slate-200">{formatMoney(editorsPool, currency)}</b>
        </div>

        {loading ? (
          <div className="mt-2 text-[11px] text-slate-500">Loading…</div>
        ) : top.length === 0 ? (
          <div className="mt-2 text-[11px] text-slate-500">No data.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {top.map((r) => (
              <div
                key={r.editor._id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-slate-100">
                    #{r.rank} {r.editor.username}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Chapters: {r.chaptersUploaded.toLocaleString("en-US")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-emerald-200">
                    {formatMoney(r.payout, currency)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Views: {r.chapterMonthlyViews.toLocaleString("en-US")}
                  </div>
                </div>
              </div>
            ))}
            <Link
              href="/editor/leaderboard"
              className="block rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-2 text-center text-[11px] text-slate-300 hover:bg-slate-950/70"
            >
              View full leaderboard →
            </Link>
          </div>
        )}
      </section>
    );
  }
}

