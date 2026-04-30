"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserSpenderLeaderboard, UserLeaderboardResponse } from "@/lib/userLeaderboard";

function formatMoney(n: number, currency: string) {
  const v = Number(n || 0);
  return `${v.toLocaleString("en-US")} ${currency}`;
}

function TrophyIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 18, height: 18, ...style }}>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.5 14.2c.5.5.9 1.1.9 1.8V18H9v2h6v-2h-2.4v-2c0-.7.3-1.3.9-1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 5h3v2a4 4 0 0 1-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 5H5v2a4 4 0 0 0 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 4h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function InitialBadge({ name }: { name: string }) {
  const initial = (name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <div
      className="flex items-center justify-center text-[13px] font-bold shrink-0"
      style={{
        width: 38, height: 38,
        borderRadius: 10,
        background: "linear-gradient(135deg,var(--arc-cyan-dim),rgba(255,255,255,.04))",
        border: "1px solid var(--arc-border)",
        color: "var(--arc-cyan)",
        fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
      }}
    >
      {initial}
    </div>
  );
}

export default function UserLeaderboardPage() {
  const [data, setData] = useState<UserLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserSpenderLeaderboard({ limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.response?.data?.message || "Failed to load leaderboard");
        setData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const currency = data?.currency || "MNT";
  const rows = useMemo(() => data?.users || [], [data]);
  const top3 = rows.slice(0, 3);

  return (
    <div className="min-h-screen" style={{ background: "var(--arc-bg)" }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 20% 15%,oklch(0.72 0.17 195/.08),transparent 45%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 80% 30%,oklch(0.65 0.22 15/.06),transparent 45%)" }} />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <div
                className="inline-flex items-center gap-2 text-[11px] font-semibold"
                style={{
                  borderRadius: 99, border: "1px solid var(--arc-border)",
                  background: "var(--arc-elevated)", padding: "4px 12px",
                  color: "var(--arc-dim)",
                }}
              >
                <TrophyIcon style={{ color: "var(--arc-amber)" }} />
                Top supporters
              </div>
              <h1
                className="mt-4 text-[32px] font-extrabold tracking-tight"
                style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)", letterSpacing: "-0.025em" }}
              >
                Leaderboard
              </h1>
              <p className="mt-2 text-[13px]" style={{ color: "var(--arc-dim)", maxWidth: 400 }}>
                Users ranked by total money spent on ARC•READ.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { label: "Scope", value: "All-time" },
                  { label: "Currency", value: currency },
                  { label: "Listed", value: String(rows.length) },
                ].map(({ label, value }) => (
                  <span
                    key={label}
                    className="text-[11px]"
                    style={{
                      borderRadius: 99, border: "1px solid var(--arc-border)",
                      background: "var(--arc-elevated)", padding: "3px 10px",
                      color: "var(--arc-dim)",
                    }}
                  >
                    {label}: <b style={{ color: "var(--arc-text)" }}>{value}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        {error && (
          <div
            className="mb-4 rounded-[10px] px-3 py-2 text-[12px]"
            style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}
          >
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-[14px] p-5"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
                >
                  <div className="h-4 w-24 rounded" style={{ background: "var(--arc-elevated)" }} />
                  <div className="mt-4 h-7 w-40 rounded" style={{ background: "var(--arc-elevated)" }} />
                  <div className="mt-2 h-4 w-32 rounded" style={{ background: "var(--arc-elevated)" }} />
                </div>
              ))}
            </div>
            <div className="animate-pulse overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="h-12" style={{ background: "var(--arc-elevated)" }} />
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="h-10 rounded-[10px]" style={{ background: "var(--arc-elevated)" }} />
                ))}
              </div>
            </div>
          </div>
        ) : !data ? null : (
          <>
            {/* Podium */}
            <section className="grid gap-4 md:grid-cols-3">
              {[
                { idx: 1, rank: 2, rankColor: "#b0b0c8", borderColor: "rgba(180,180,200,.15)", bg: "linear-gradient(135deg,rgba(180,180,200,.05),var(--arc-card))" },
                { idx: 0, rank: 1, rankColor: "var(--arc-amber)", borderColor: "oklch(0.82 0.16 85/.3)", bg: "linear-gradient(135deg,oklch(0.82 0.16 85/.08),var(--arc-card))" },
                { idx: 2, rank: 3, rankColor: "oklch(0.75 0.12 15)", borderColor: "oklch(0.65 0.22 15/.2)", bg: "linear-gradient(135deg,oklch(0.65 0.22 15/.06),var(--arc-card))" },
              ].map((slot) => {
                const r = top3[slot.idx];
                return (
                  <div
                    key={slot.rank}
                    className="relative overflow-hidden rounded-[14px] p-5"
                    style={{ border: `1px solid ${slot.borderColor}`, background: slot.bg }}
                  >
                    <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 20% 20%,rgba(255,255,255,.04),transparent)" }} />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>Rank</span>
                        <span className="text-[22px] font-bold leading-none" style={{ color: slot.rankColor, fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", letterSpacing: "-0.03em" }}>
                          #{slot.rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <InitialBadge name={r?.user.username || ""} />
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-bold" style={{ color: "#fff", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>{r?.user.username || "—"}</div>
                          <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Top supporter</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--arc-muted)" }}>Total spent</div>
                      <div className="text-[22px] font-bold" style={{ color: slot.rankColor, fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", letterSpacing: "-0.02em" }}>
                        {r ? formatMoney(r.totalSpent, currency) : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Full table */}
            <section
              className="mt-6 overflow-hidden rounded-[14px]"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px var(--arc-cyan-glow)" }} />
                  <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Full ranking</span>
                </div>
                <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Updated from recorded payments</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[13px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>Rank</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>User</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>Total spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const highlightBg =
                        r.rank === 1 ? "oklch(0.82 0.16 85/.04)"
                        : r.rank === 2 ? "rgba(255,255,255,.02)"
                        : r.rank === 3 ? "oklch(0.65 0.22 15/.04)"
                        : "transparent";
                      return (
                        <tr
                          key={r.user._id}
                          style={{ borderBottom: idx < rows.length - 1 ? "1px solid var(--arc-border)" : "none", background: highlightBg }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = highlightBg)}
                        >
                          <td className="px-4 py-3">
                            <span
                              className="text-[13px] font-semibold"
                              style={{
                                color: r.rank === 1 ? "var(--arc-amber)" : r.rank <= 3 ? "var(--arc-cyan)" : "var(--arc-muted)",
                                fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
                              }}
                            >
                              #{r.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <InitialBadge name={r.user.username} />
                              <div className="min-w-0">
                                <div className="truncate font-semibold" style={{ color: "var(--arc-text)" }}>{r.user.username}</div>
                                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>User</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--arc-amber)" }}>
                            {formatMoney(r.totalSpent, currency)}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td className="px-4 py-8 text-[13px]" style={{ color: "var(--arc-muted)" }} colSpan={3}>
                          No spend data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mt-4 text-[11px]" style={{ color: "var(--arc-muted)" }}>
              Spend totals are calculated from successful VIP payments recorded in the system.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
