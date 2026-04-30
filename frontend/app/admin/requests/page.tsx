"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminGetRequests, type RequestItem } from "@/lib/requests";

function RequestBadge({ title, imageUrl }: { title: string; imageUrl?: string }) {
  const initial = (title || "?").trim().slice(0, 1).toUpperCase();
  if (imageUrl) {
    return (
      <div className="h-10 w-10 overflow-hidden rounded-[10px]" style={{ border: "1px solid var(--arc-border)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[13px] font-bold" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}>
      {initial}
    </div>
  );
}

export default function AdminReaderRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [monthKey, setMonthKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetRequests();
      setItems(data.items || []);
      setMonthKey(data.monthKey || "");
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Хүсэлтүүдийг уншиж чадсангүй");
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const rows = useMemo(() => [...items].sort((a, b) => b.votesThisMonth - a.votesThisMonth), [items]);

  return (
    <AdminShell title="Уншигчийн хүсэлтүүд" subtitle="Уншигчдын хүсэлт, саналын жагсаалт (сарын дүнгээр эрэмбэлэгдсэн).">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
            Сар: <span style={{ color: "var(--arc-text)" }}>{monthKey || "--"}</span>
          </div>
          <button onClick={load} className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}>
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-[9px] px-3 py-2 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>{error}</div>
        )}

        {loading ? (
          <div className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Loading…</div>
        ) : (
          <div className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead style={{ background: "var(--arc-elevated)", borderBottom: "1px solid var(--arc-border)" }}>
                  <tr>
                    {["Rank", "Manhua", "This month", "Total", "Created"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide${i >= 2 && i <= 3 ? " text-right" : ""}`} style={{ color: "var(--arc-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr key={item.id} style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                        <td className="px-4 py-3 text-[13px]" style={{ color: "var(--arc-dim)" }}>#{rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <RequestBadge title={item.title} imageUrl={item.imageUrl} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold" style={{ color: "var(--arc-text)" }}>{item.title}</div>
                              <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Manhua request</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--arc-cyan)" }}>{item.votesThisMonth}</td>
                        <td className="px-4 py-3 text-right" style={{ color: "var(--arc-dim)" }}>{item.votes}</td>
                        <td className="px-4 py-3 text-[12px]" style={{ color: "var(--arc-muted)" }}>{new Date(item.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td className="px-4 py-6 text-[13px]" colSpan={5} style={{ color: "var(--arc-muted)" }}>Хүсэлт алга.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
