"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { editorGetLeaderboard, EditorLeaderboardResponse } from "@/lib/editorLeaderboard";

function formatMoney(n: number, currency: string) {
  const v = Number(n || 0);
  return `${v.toLocaleString("en-US")} ${currency}`;
}

export default function AdminLeaderboardPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<EditorLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (m = month) => {
    setLoading(true);
    try {
      const res = await editorGetLeaderboard({ month: m });
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load leaderboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const currency = data?.currency || "MNT";
  const rows = useMemo(() => data?.editors || [], [data]);

  return (
    <AdminShell title="Leaderboard" subtitle="Monthly editor chapters + payouts.">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs text-slate-400">Month</div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-[180px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>
          <button
            onClick={() => load(month)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="text-sm text-slate-400">Loading leaderboard...</div>
        ) : !data ? null : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Editors pool (70%)
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {formatMoney(data.editorsPool, currency)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Total chapter views (month)
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {data.totalChapterViews.toLocaleString("en-US")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Total revenue
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {formatMoney(data.totalRevenue, currency)}
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-xs text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Editor</th>
                      <th className="px-4 py-3">Chapters uploaded</th>
                      <th className="px-4 py-3">Chapter views</th>
                      <th className="px-4 py-3">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rows.map((r) => (
                      <tr key={r.editor._id} className="hover:bg-slate-950/40">
                        <td className="px-4 py-3 text-slate-200">#{r.rank}</td>
                        <td className="px-4 py-3 font-semibold text-slate-100">
                          {r.editor.username}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {r.chaptersUploaded.toLocaleString("en-US")}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {r.chapterMonthlyViews.toLocaleString("en-US")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-200">
                          {formatMoney(r.payout, currency)}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                          No data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

