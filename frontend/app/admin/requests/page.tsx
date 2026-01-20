"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";

type RequestItem = {
  id: string;
  title: string;
  imageUrl?: string;
  createdAt: string;
  votes: number;
  votesThisMonth: number;
};

type RequestsResponse = {
  monthKey: string;
  items: RequestItem[];
};

function RequestBadge({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl?: string;
}) {
  const initial = (title || "?").trim().slice(0, 1).toUpperCase();
  if (imageUrl) {
    return (
      <div className="h-10 w-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm font-bold text-slate-100">
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
      const res = await fetch("/api/requests");
      const data = (await res.json()) as RequestsResponse;
      setItems(data.items || []);
      setMonthKey(data.monthKey || "");
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Хүсэлтүүдийг уншиж чадсангүй");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(
    () => [...items].sort((a, b) => b.votesThisMonth - a.votesThisMonth),
    [items]
  );

  return (
    <AdminShell
      title="Уншигчийн хүсэлтүүд"
      subtitle="Уншигчдын хүсэлт, саналын жагсаалт (сарын дүнгээр эрэмбэлэгдсэн)."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="text-xs text-slate-400">
            Сар: <span className="text-slate-200">{monthKey || "--"}</span>
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
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Manhua</th>
                    <th className="px-4 py-3 text-right">This month</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((item, idx) => {
                    const rank = idx + 1;
                    const highlight =
                      rank === 1
                        ? "bg-amber-500/5"
                        : rank === 2
                        ? "bg-slate-500/5"
                        : rank === 3
                        ? "bg-rose-500/5"
                        : "";
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-950/40 ${highlight}`}
                      >
                        <td className="px-4 py-3 text-slate-200">#{rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <RequestBadge
                              title={item.title}
                              imageUrl={item.imageUrl}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-100">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Manhua request
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-cyan-200">
                          {item.votesThisMonth}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {item.votes}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-6 text-sm text-slate-400"
                        colSpan={5}
                      >
                        Хүсэлт алга.
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
