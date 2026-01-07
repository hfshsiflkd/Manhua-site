"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserSpenderLeaderboard, UserLeaderboardResponse } from "@/lib/userLeaderboard";

function formatMoney(n: number, currency: string) {
  const v = Number(n || 0);
  return `${v.toLocaleString("en-US")} ${currency}`;
}

function TrophyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M8 4h8v3a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 14.2c.5.5.9 1.1.9 1.8V18H9v2h6v-2h-2.4v-2c0-.7.3-1.3.9-1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 5h3v2a4 4 0 0 1-3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 5H5v2a4 4 0 0 0 3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 4h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InitialBadge({ name }: { name: string }) {
  const initial = (name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm font-bold text-slate-100">
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
    return () => {
      cancelled = true;
    };
  }, []);

  const currency = data?.currency || "MNT";
  const rows = useMemo(() => data?.users || [], [data]);
  const top3 = rows.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-indigo-950/25 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.10),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(167,139,250,0.10),transparent_45%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-300">
                <TrophyIcon className="h-4 w-4 text-amber-300" />
                Top supporters
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                Leaderboard
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Users ranked by total money spent on ARC•READ.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-slate-300">
                  Scope: <b className="text-slate-100">All-time</b>
                </span>
                <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-slate-300">
                  Currency: <b className="text-slate-100">{currency}</b>
                </span>
                <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-slate-300">
                  Listed: <b className="text-slate-100">{rows.length}</b>
                </span>
              </div>
            </div>

            <div className="grid w-full max-w-md grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 shadow-lg shadow-black/30"
                >
                  <div className="h-3 w-10 rounded-full bg-slate-800/60" />
                  <div className="mt-3 h-6 w-16 rounded-lg bg-slate-800/60" />
                  <div className="mt-2 h-4 w-20 rounded-lg bg-slate-800/60" />
                </div>
              ))}
              <div className="col-span-3 hidden" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-16">

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

        {loading && !data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
                >
                  <div className="h-4 w-24 rounded bg-slate-800/70" />
                  <div className="mt-4 h-7 w-40 rounded bg-slate-800/70" />
                  <div className="mt-2 h-4 w-32 rounded bg-slate-800/70" />
                </div>
              ))}
            </div>
            <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
              <div className="h-12 bg-slate-950/40" />
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="h-10 rounded-xl bg-slate-800/50" />
                ))}
              </div>
            </div>
          </div>
        ) : !data ? null : (
          <>
            {/* Podium */}
            <section className="grid gap-4 md:grid-cols-3">
              {[
                { idx: 1, label: "2nd", accent: "from-slate-300/20 to-slate-900/40", ring: "border-slate-700", amount: "text-slate-100" },
                { idx: 0, label: "1st", accent: "from-amber-400/20 to-slate-900/40", ring: "border-amber-500/40", amount: "text-amber-200" },
                { idx: 2, label: "3rd", accent: "from-rose-400/15 to-slate-900/40", ring: "border-rose-500/30", amount: "text-rose-200" },
              ].map((slot) => {
                const r = top3[slot.idx];
                return (
                  <div
                    key={slot.label}
                    className={[
                      "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-lg shadow-black/30",
                      slot.ring,
                      slot.accent,
                    ].join(" ")}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.06),transparent_55%)]" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          {slot.label}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <InitialBadge name={r?.user.username || ""} />
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-slate-50">
                              {r?.user.username || "—"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Top supporter
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-2">
                        <TrophyIcon className="h-5 w-5 text-slate-200" />
                      </div>
                    </div>

                    <div className="relative mt-4">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Total spent
                      </div>
                      <div className={`mt-1 text-2xl font-bold ${slot.amount}`}>
                        {r ? formatMoney(r.totalSpent, currency) : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Full table */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-4 py-3">
                <div className="text-sm font-semibold text-slate-100">
                  Full ranking
                </div>
                <div className="text-[11px] text-slate-400">
                  Updated from recorded payments
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950/40 text-xs text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3 text-right">Total spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rows.map((r) => {
                      const highlight =
                        r.rank === 1
                          ? "bg-amber-500/5"
                          : r.rank === 2
                          ? "bg-slate-500/5"
                          : r.rank === 3
                          ? "bg-rose-500/5"
                          : "";
                      return (
                        <tr
                          key={r.user._id}
                          className={`hover:bg-slate-950/40 ${highlight}`}
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="text-slate-200">#{r.rank}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <InitialBadge name={r.user.username} />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-100">
                                  {r.user.username}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  User
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-200">
                            {formatMoney(r.totalSpent, currency)}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td
                          className="px-4 py-8 text-sm text-slate-400"
                          colSpan={3}
                        >
                          No spend data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mt-4 text-[11px] text-slate-500">
              Spend totals are calculated from successful VIP payments recorded in the system.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

