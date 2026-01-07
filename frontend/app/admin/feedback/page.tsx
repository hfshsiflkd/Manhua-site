"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../components/AdminShell";
import { adminListFeedback, type AdminFeedback } from "@/lib/feedback";

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
      const res = await adminListFeedback({
        page: 1,
        limit: 50,
        status: filters.status === "all" ? undefined : filters.status,
        type: filters.type === "all" ? undefined : filters.type,
      });
      setItems(res.items);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load feedback");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.type]);

  const rows = useMemo(() => items, [items]);

  return (
    <AdminShell title="Feedback" subtitle="Suggestions, requests, and complaints from users.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-2">
            <div>
              <div className="text-xs text-slate-400">Status</div>
              <select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as any }))}
                className="mt-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400">Type</div>
              <select
                value={filters.type}
                onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value as any }))}
                className="mt-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="suggestion_request">Suggestion/Request</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>
          </div>

          <button
            onClick={load}
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

        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Preview</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((f) => (
                    <tr key={f._id} className="hover:bg-slate-950/40">
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(f.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {labelType(f.type)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-1 text-[11px] text-slate-200">
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-100">
                        {f.name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {f.description ? (
                          <>
                            {f.description.slice(0, 60)}
                            {f.description.length > 60 ? "…" : ""}
                          </>
                        ) : (
                          <span className="text-slate-500 italic">No description</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/feedback/${f._id}`}
                          className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                        No feedback yet.
                      </td>
                    </tr>
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

