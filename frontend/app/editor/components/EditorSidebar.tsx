"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { editorGetLeaderboard, LeaderboardRow } from "@/lib/editorLeaderboard";
import { useEffect, useMemo, useState } from "react";

interface EditorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}

function formatMoney(n: number, currency: string) {
  return `${Number(n || 0).toLocaleString("en-US")} ${currency}`;
}

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
    return () => { cancelled = true; };
  }, [month]);

  return (
    <section className="mx-3 mb-3 rounded-[12px] p-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold" style={{ color: "var(--arc-text)" }}>🏆 Leaderboard</div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-[120px] rounded-[7px] px-2 py-1 text-[11px] outline-none"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-bg)", color: "var(--arc-text)" }}
        />
      </div>

      <div className="mt-2 text-[11px]" style={{ color: "var(--arc-muted)" }}>
        Editors pool: <b style={{ color: "var(--arc-text)" }}>{formatMoney(editorsPool, currency)}</b>
      </div>

      {loading ? (
        <div className="mt-2 text-[11px]" style={{ color: "var(--arc-muted)" }}>Loading…</div>
      ) : top.length === 0 ? (
        <div className="mt-2 text-[11px]" style={{ color: "var(--arc-muted)" }}>No data.</div>
      ) : (
        <div className="mt-2 space-y-1.5">
          {top.map((r) => (
            <div
              key={r.editor._id}
              className="flex items-center justify-between rounded-[9px] px-2 py-1.5"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
            >
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold" style={{ color: "var(--arc-text)" }}>
                  #{r.rank} {r.editor.displayName || r.editor.username}
                </div>
                <div className="text-[10px]" style={{ color: "var(--arc-muted)" }}>
                  Chapters: {r.chaptersUploaded.toLocaleString("en-US")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold" style={{ color: "oklch(0.8 0.14 145)" }}>
                  {formatMoney(r.payout, currency)}
                </div>
                <div className="text-[10px]" style={{ color: "var(--arc-muted)" }}>
                  Views: {r.chapterMonthlyViews.toLocaleString("en-US")}
                </div>
              </div>
            </div>
          ))}
          <Link
            href="/editor/leaderboard"
            className="block rounded-[9px] px-2 py-1.5 text-center text-[11px] transition-opacity hover:opacity-80"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-cyan)" }}
          >
            View full leaderboard →
          </Link>
        </div>
      )}
    </section>
  );
}

export default function EditorSidebar({ isOpen, onClose, pathname }: EditorSidebarProps) {
  const { user } = useAuth();

  const roleNorm = String(user?.role || "").toLowerCase().trim();
  const isAdmin = roleNorm === "admin";
  const isEditor = roleNorm === "editor";

  const navItems = [
    { href: "/editor/manhuas", label: "My Manhuas", icon: "📚" },
    { href: "/editor/teams", label: "Teams", icon: "👥" },
  ];
  if (isAdmin || isEditor) {
    navItems.push({ href: "/editor/leaderboard", label: "Leaderboard", icon: "🏆" });
  }

  const isActive = (href: string) => {
    if (href === "/editor/manhuas") {
      return pathname === href || pathname.startsWith("/editor/manhuas/");
    }
    return pathname === href;
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid var(--arc-border)" }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: "oklch(0.72 0.17 195/.15)", border: "1px solid oklch(0.72 0.17 195/.3)" }}>
          <span className="text-lg">✏️</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold truncate" style={{ color: "var(--arc-text)" }}>Editor Dashboard</h2>
            <p className="text-[10px] truncate" style={{ color: "var(--arc-muted)" }}>{user?.username || "Editor"}</p>
          </div>
          {mobile && (
            <button
              onClick={onClose}
              className="rounded-[7px] p-1.5 transition-colors"
              style={{ color: "var(--arc-muted)", border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={mobile ? onClose : undefined}
              className="flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium transition-colors"
              style={active
                ? { background: "oklch(0.72 0.17 195/.12)", color: "var(--arc-cyan)", border: "1px solid oklch(0.72 0.17 195/.25)" }
                : { color: "var(--arc-dim)", border: "1px solid transparent" }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {(isAdmin || isEditor) && <LeaderboardPanel />}

      <div className="mt-auto p-4" style={{ borderTop: "1px solid var(--arc-border)" }}>
        <Link
          href="/"
          onClick={mobile ? onClose : undefined}
          className="flex items-center gap-2 rounded-[9px] px-3 py-2 text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--arc-muted)" }}
        >
          <span>←</span>
          <span>Нүүр хуудас</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col lg:flex"
        style={{ borderRight: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 flex-col transition-transform duration-300 lg:hidden ${isOpen ? "translate-x-0 flex" : "-translate-x-full hidden"}`}
        style={{ borderRight: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}
      >
        <SidebarContent mobile />
      </aside>
    </>
  );
}
