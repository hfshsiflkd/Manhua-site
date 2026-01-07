"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminGetFinanceMonth, FinanceMonthResponse } from "@/lib/adminFinance";

function formatMoney(n: number, currency: string) {
  const v = Number(n || 0);
  return `${v.toLocaleString("en-US")} ${currency}`;
}

export default function AdminFinancePage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<FinanceMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (m = month) => {
    setLoading(true);
    try {
      const res = await adminGetFinanceMonth({ month: m });
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load finance data");
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
    <AdminShell
      title="Finance"
      subtitle="Monthly editor metrics + proportional 30/70 distribution."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs text-slate-400">Month</div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-[180px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
          <div className="text-sm text-slate-400">Loading finance...</div>
        ) : !data ? null : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Total revenue
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {formatMoney(data.totalRevenue, currency)}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  Based on recorded payments for this month.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <p className="text-[11px] uppercase tracking-wide text-emerald-200">
                  Editors pool (70%)
                </p>
                <p className="mt-2 text-2xl font-semibold text-emerald-100">
                  {formatMoney(data.editorsPool, currency)}
                </p>
                <p className="mt-1 text-[12px] text-emerald-200/80">
                  Distributed proportionally by metrics.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-[11px] uppercase tracking-wide text-amber-200">
                  Site share (30%)
                </p>
                <p className="mt-2 text-2xl font-semibold text-amber-100">
                  {formatMoney(data.siteShare, currency)}
                </p>
                <p className="mt-1 text-[12px] text-amber-200/80">
                  Kept by the site.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                  Chapters uploaded:{" "}
                  <b className="text-slate-50">
                    {data.totals.chaptersUploaded.toLocaleString("en-US")}
                  </b>
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                  Manhuas uploaded:{" "}
                  <b className="text-slate-50">
                    {data.totals.manhuasUploaded.toLocaleString("en-US")}
                  </b>
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                  Monthly views:{" "}
                  <b className="text-slate-50">
                    {data.totals.manhuaMonthlyViews.toLocaleString("en-US")}
                  </b>
                </span>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-xs text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Editor</th>
                      <th className="px-4 py-3">Chapters (month)</th>
                      <th className="px-4 py-3">Manhuas (month)</th>
                      <th className="px-4 py-3">Views (month)</th>
                      <th className="px-4 py-3">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rows.map((r) => (
                      <tr key={r.editor._id} className="hover:bg-slate-950/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-100">
                            {r.editor.username}
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.editor.email || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {r.chaptersUploaded.toLocaleString("en-US")}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {r.manhuasUploaded.toLocaleString("en-US")}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {r.manhuaMonthlyViews.toLocaleString("en-US")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-200">
                          {formatMoney(r.payout, currency)}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td
                          className="px-4 py-6 text-sm text-slate-400"
                          colSpan={5}
                        >
                          No editors found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">
                Per-editor manhwa views (month)
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {rows.map((r) => (
                  <div
                    key={`${r.editor._id}-manhuas`}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-100">
                        {r.editor.username}
                      </div>
                      <div className="text-xs text-slate-400">
                        {r.manhuaMonthlyViews.toLocaleString("en-US")} views
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(r.manhuas || []).slice(0, 8).map((m) => (
                        <div
                          key={m._id}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                        >
                          <div className="text-xs text-slate-200">
                            {m.title}
                          </div>
                          <div className="text-xs text-slate-400">
                            {m.monthlyViews.toLocaleString("en-US")} /{" "}
                            {m.lifetimeViews.toLocaleString("en-US")}
                          </div>
                        </div>
                      ))}
                      {(r.manhuas || []).length === 0 && (
                        <div className="text-xs text-slate-500">
                          No manhuas.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-500">
                Note: the “views (month)” number is summed from `dailyViews` for
                the selected month; the right-side number is lifetime views.
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

