"use client";

import { useEffect, useMemo, useState } from "react";
import { editorGetLeaderboard, EditorLeaderboardResponse } from "@/lib/editorLeaderboard";
import { useAuth } from "@/context/AuthContext";

function formatMoney(n: number, currency: string) {
  return `${Number(n || 0).toLocaleString("en-US")} ${currency}`;
}

export default function EditorLeaderboardPage() {
  const { user } = useAuth();
  const roleNorm = String(user?.role || "").toLowerCase().trim();
  const canSee = roleNorm === "admin" || roleNorm === "editor";

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<EditorLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (m = month) => {
    setLoading(true);
    try {
      setData(await editorGetLeaderboard({ month: m }));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load leaderboard");
      setData(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (canSee) load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, canSee]);

  const currency = data?.currency || "MNT";
  const rows = useMemo(() => data?.editors || [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--arc-text)" }}>Leaderboard</h1>
          <p className="text-xs" style={{ color: "var(--arc-muted)" }}>
            Ranked by payout (based on chapter views). Visible to editors and admins.
          </p>
        </div>
        <div className="flex items-end gap-2">
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
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {!canSee && (
        <div className="rounded-[9px] px-3 py-3 text-sm" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
          Leaderboard is available for <b>editors</b> and <b>admins</b> only.
        </div>
      )}

      {error && canSee && (
        <div className="rounded-[9px] px-3 py-2 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      {canSee && loading && !data ? (
        <div className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Loading leaderboard...</div>
      ) : !canSee || !data ? null : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Total revenue", value: formatMoney(data.totalRevenue, currency), accent: false },
              { label: "Editors pool (70%)", value: formatMoney(data.editorsPool, currency), accent: true },
              { label: "Total chapter views (month)", value: data.totalChapterViews.toLocaleString("en-US"), accent: false },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-[14px] p-4"
                style={accent
                  ? { border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.06)" }
                  : { border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: accent ? "oklch(0.8 0.14 145)" : "var(--arc-muted)" }}>{label}</p>
                <p className="mt-2 text-[22px] font-bold" style={{ color: accent ? "oklch(0.88 0.12 145)" : "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>{value}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead style={{ background: "var(--arc-elevated)", borderBottom: "1px solid var(--arc-border)" }}>
                  <tr>
                    {["Rank", "Editor", "Chapters uploaded", "Chapter views", "Payout"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.editor._id} style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                      <td className="px-4 py-3" style={{ color: "var(--arc-dim)" }}>#{r.rank}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold" style={{ color: "var(--arc-text)" }}>{r.editor.displayName || r.editor.username}</div>
                        <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{(r.editor.teamName || r.editor.role || "").toUpperCase()}</div>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--arc-dim)" }}>{r.chaptersUploaded.toLocaleString("en-US")}</td>
                      <td className="px-4 py-3" style={{ color: "var(--arc-dim)" }}>{r.chapterMonthlyViews.toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "oklch(0.8 0.14 145)" }}>{formatMoney(r.payout, currency)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td className="px-4 py-6 text-[13px]" colSpan={5} style={{ color: "var(--arc-muted)" }}>No data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
