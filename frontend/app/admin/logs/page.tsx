/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminGetLogs, ActionLog } from "@/lib/api";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    try {
      setLoading(true);
      const data = await adminGetLogs({ limit });
      setLogs(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <AdminShell
      title="Activity Logs"
      subtitle="See everything admins and translators are doing in real time."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            Showing latest
            <select
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            actions
          </div>
          <button
            onClick={loadLogs}
            className="inline-flex items-center rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur shadow-xl shadow-black/40 max-h-[70vh]">
          <div className="overflow-y-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-slate-400 text-sm"
                    >
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-slate-500 text-sm"
                    >
                      No logs yet
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="border-t border-slate-800/80 hover:bg-slate-900/70 transition"
                    >
                      <td className="px-4 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-[11px]">
                        <div className="flex flex-col">
                          <span className="text-slate-100">
                            {log.user?.username}
                          </span>
                          <span className="text-slate-500">
                            {log.user?.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[11px]">
                        <span className="inline-flex items-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[11px] text-slate-300">
                        {log.targetType}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-slate-400 max-w-xs">
                        {log.description || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
