/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/app/admin/manhuas/page.tsx
"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminGetManhuas, Manhua } from "@/lib/api";

export default function AdminManhuasPage() {
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await adminGetManhuas();
      setManhuas(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load manhuas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell
      title="Manhuas"
      subtitle="Бүх манхуа болон эзэн (translator/admin) мэдээллийг хянах."
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">Loading manhuas...</div>
        ) : manhuas.length === 0 ? (
          <div className="text-sm text-slate-500">
            Одоогоор manhua бүртгэгдээгүй байна.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                      Genres
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {manhuas.map((m) => (
                    <tr
                      key={m._id}
                      className="border-t border-slate-800/70 hover:bg-slate-900/80"
                    >
                      <td className="px-4 py-2 align-top">
                        <div className="flex flex-col">
                          <span className="text-slate-100 text-xs font-medium">
                            {m.title}
                          </span>
                          {m.slug && (
                            <span className="text-[10px] text-slate-500">
                              /manhua/{m.slug}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-top">
                        {m.createdBy ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-100">
                              {m.createdBy.username}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {m.createdBy.email}
                            </span>
                            <span className="mt-0.5 inline-flex w-fit rounded-full bg-slate-800 px-2 py-0.5 text-[9px] text-slate-300">
                              {m.createdBy.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                          {m.status || "unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top text-[11px] text-slate-400">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-2 align-top text-[11px] text-slate-400">
                        {m.genres && m.genres.length > 0
                          ? m.genres.join(", ")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
