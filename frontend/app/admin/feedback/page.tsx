"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../components/AdminShell";
import { adminListFeedback, type AdminFeedback } from "@/lib/feedback";

const selectStyle: React.CSSProperties = {
  borderRadius: 9, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)",
  padding: "8px 12px", fontSize: 13, color: "var(--arc-text)", outline: "none",
};

function labelType(t: AdminFeedback["type"]) {
  return t === "complaint" ? "Complaint" : "Suggestion/Request";
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all" as "all" | "new" | "reviewed" | "resolved",
    type: "all" as "all" | "suggestion_request" | "complaint",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminListFeedback({ page: 1, limit: 50, status: filters.status === "all" ? undefined : filters.status, type: filters.type === "all" ? undefined : filters.type });
      setItems(res.items);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load feedback");
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters.status, filters.type]);
  const rows = useMemo(() => items, [items]);

  return (
    <AdminShell title="Feedback" subtitle="Suggestions, requests, and complaints from users.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div>
              <div className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>Status</div>
              <select style={selectStyle} value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as any }))}>
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <div className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>Type</div>
              <select style={selectStyle} value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value as any }))}>
                <option value="all">All</option>
                <option value="suggestion_request">Suggestion/Request</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>
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
                    {["Created", "Type", "Status", "Name", "Preview", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr key={f._id} style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "var(--arc-muted)" }}>{new Date(f.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: "var(--arc-dim)" }}>{labelType(f.type)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-1 text-[11px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>{f.status}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--arc-text)" }}>{f.name}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "var(--arc-muted)" }}>
                        {f.description ? <>{f.description.slice(0, 60)}{f.description.length > 60 ? "…" : ""}</> : <span className="italic">No description</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/feedback/${f._id}`} className="rounded-full px-3 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
                          style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td className="px-4 py-6 text-[13px]" colSpan={6} style={{ color: "var(--arc-muted)" }}>No feedback yet.</td></tr>
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
