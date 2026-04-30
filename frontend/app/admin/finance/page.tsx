"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminGetFinanceMonth, FinanceMonthResponse } from "@/lib/adminFinance";

function formatMoney(n: number, currency: string) {
  return `${Number(n || 0).toLocaleString("en-US")} ${currency}`;
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
      setData(await adminGetFinanceMonth({ month: m }));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load finance data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(month); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month]);

  const currency = data?.currency || "MNT";
  const rows = useMemo(() => data?.editors || [], [data]);

  return (
    <AdminShell title="Finance" subtitle="Monthly editor metrics + proportional 30/70 distribution.">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>Month</div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[180px] rounded-[9px] px-3 py-2 text-[13px] outline-none"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
            />
          </div>
          <button
            onClick={() => load(month)}
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-[9px] px-3 py-2 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Loading finance...</div>
        ) : !data ? null : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>Total revenue</p>
                <p className="mt-2 text-[24px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{formatMoney(data.totalRevenue, currency)}</p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--arc-muted)" }}>Based on recorded payments for this month.</p>
              </div>

              <div className="rounded-[14px] p-4" style={{ border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.06)" }}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "oklch(0.8 0.14 145)" }}>Editors pool (70%)</p>
                <p className="mt-2 text-[24px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "oklch(0.8 0.14 145)" }}>{formatMoney(data.editorsPool, currency)}</p>
                <p className="mt-1 text-[12px]" style={{ color: "oklch(0.75 0.17 145/.7)" }}>Distributed proportionally by metrics.</p>
              </div>

              <div className="rounded-[14px] p-4" style={{ border: "1px solid oklch(0.82 0.16 85/.4)", background: "oklch(0.82 0.16 85/.06)" }}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--arc-amber)" }}>Site share (30%)</p>
                <p className="mt-2 text-[24px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-amber)" }}>{formatMoney(data.siteShare, currency)}</p>
                <p className="mt-1 text-[12px]" style={{ color: "oklch(0.82 0.16 85/.7)" }}>Kept by the site.</p>
              </div>
            </section>

            <section className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="flex flex-wrap gap-3 text-[12px]" style={{ color: "var(--arc-dim)" }}>
                {[
                  ["Chapters uploaded", data.totals.chaptersUploaded.toLocaleString("en-US")],
                  ["Manhuas uploaded", data.totals.manhuasUploaded.toLocaleString("en-US")],
                  ["Monthly views", data.totals.chapterMonthlyViews.toLocaleString("en-US")],
                ].map(([label, val]) => (
                  <span key={label} className="rounded-full px-3 py-1" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                    {label}: <b style={{ color: "var(--arc-text)" }}>{val}</b>
                  </span>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[13px]">
                  <thead>
                    <tr style={{ background: "var(--arc-elevated)" }}>
                      {["Editor", "Chapters (month)", "Manhuas (month)", "Chapter views (month)", "Payout"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.editor._id} style={{ borderTop: "1px solid var(--arc-border)" }}>
                        <td className="px-4 py-3">
                          <div className="font-semibold" style={{ color: "var(--arc-text)" }}>{r.editor.username}</div>
                          <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{r.editor.email || ""}</div>
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--arc-dim)" }}>{r.chaptersUploaded.toLocaleString("en-US")}</td>
                        <td className="px-4 py-3" style={{ color: "var(--arc-dim)" }}>{r.manhuasUploaded.toLocaleString("en-US")}</td>
                        <td className="px-4 py-3" style={{ color: "var(--arc-dim)" }}>{r.chapterMonthlyViews.toLocaleString("en-US")}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "oklch(0.8 0.14 145)" }}>{formatMoney(r.payout, currency)}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-[13px]" colSpan={5} style={{ color: "var(--arc-muted)" }}>No editors found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[14px] font-semibold" style={{ color: "var(--arc-text)" }}>Per-editor manhwa totals (from chapter views, month)</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {rows.map((r) => (
                  <div key={`${r.editor._id}-manhuas`} className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>{r.editor.username}</div>
                      <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{r.chapterMonthlyViews.toLocaleString("en-US")} chapter views</div>
                    </div>
                    <div className="space-y-2">
                      {(r.manhuas || []).slice(0, 8).map((m) => (
                        <div key={m._id} className="flex items-center justify-between rounded-[9px] px-3 py-2" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                          <div className="text-[12px]" style={{ color: "var(--arc-dim)" }}>{m.title}</div>
                          <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{m.monthlyViews.toLocaleString("en-US")} / {m.lifetimeViews.toLocaleString("en-US")}</div>
                        </div>
                      ))}
                      {(r.manhuas || []).length === 0 && (
                        <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>No manhuas.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
                Note: "chapter views (month)" is summed from `Chapter.dailyViews` for the selected month; the right-side number is the manhwa lifetime views.
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
