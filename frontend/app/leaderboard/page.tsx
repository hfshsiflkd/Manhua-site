"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserSpenderLeaderboard, UserLeaderboardResponse } from "@/lib/userLeaderboard";

function formatMoney(n: number, currency: string) {
  const v = Number(n || 0);
  return `${v.toLocaleString("en-US")} ${currency}`;
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Top users by total money spent on the site.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : !data ? null : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Total spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.user._id} className="hover:bg-slate-950/40">
                    <td className="px-4 py-3 text-slate-200">#{r.rank}</td>
                    <td className="px-4 py-3 font-semibold text-slate-100">
                      {r.user.username}
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-200">
                      {formatMoney(r.totalSpent, currency)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={3}>
                      No spend data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

