/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../components/AdminShell";
import { adminGetManhuas, Manhua } from "@/lib/api";

export default function AdminManhuasPage() {
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await adminGetManhuas(); // /admin/manhuas (backend: /api/admin/manhuas)
      setManhuas(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error("[AdminManhuas] load error:", e);
      setManhuas([]);
      setError(e?.response?.data?.message || "Manhuas ачаалж чадсангүй");
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
      subtitle="Бүх манхуа, тэдгээрийг нэмсэн хэрэглэгч (translator/admin)–ийг эндээс хянаж удирдана."
    >
      <div className="space-y-4">
        {/* Дээд талын action / info */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Энэ хүснэгт нь{" "}
            <code className="rounded bg-slate-900 px-1 py-[1px] text-[10px] text-cyan-300">
              GET /api/admin/manhuas
            </code>{" "}
            endpoint-оос өгөгдөл авч байна.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {/* Шинэ manhua нэмэх */}
            <Link
              href="manhuas/new"
              className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
            >
              + New manhua
            </Link>

            {/* Editor panel руу */}
            <Link
              href="/editor/manhuas"
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800"
            >
              Editor panel руу очих
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">Manhuas ачаалж байна...</div>
        ) : manhuas.length === 0 ? (
          <div className="text-sm text-slate-500">
            Одоогоор manhua бүртгэгдээгүй байна.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/60">
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
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {manhuas.map((m) => {
                    const owner = m.createdBy;
                    const status = (m.status || "unknown").toLowerCase();

                    const statusClass =
                      status === "completed"
                        ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                        : status === "ongoing"
                        ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/40"
                        : "bg-slate-700/70 text-slate-200 border border-slate-600/70";

                    return (
                      <tr
                        key={m._id}
                        className="border-t border-slate-800/70 hover:bg-slate-900/80"
                      >
                        {/* TITLE */}
                        <td className="px-4 py-2 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-slate-100">
                              {m.title}
                            </span>
                            {m.slug && (
                              <span className="text-[10px] text-slate-500">
                                /manhua/{m.slug}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* OWNER */}
                        <td className="px-4 py-2 align-top">
                          {owner ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-slate-100">
                                {owner.username}
                              </span>
                              {owner.email && (
                                <span className="text-[10px] text-slate-400">
                                  {owner.email}
                                </span>
                              )}
                              {owner.role && (
                                <span className="mt-0.5 inline-flex w-fit rounded-full bg-slate-800 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-300">
                                  {owner.role}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Unknown
                            </span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-2 align-top">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${statusClass}`}
                          >
                            {m.status || "unknown"}
                          </span>
                        </td>

                        {/* CREATED */}
                        <td className="px-4 py-2 align-top text-[11px] text-slate-400">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleDateString()
                            : "-"}
                        </td>

                        {/* GENRES */}
                        <td className="px-4 py-2 align-top text-[11px] text-slate-400">
                          {m.genres && m.genres.length > 0
                            ? m.genres.join(", ")
                            : "-"}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-2 align-top">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {/* Public view */}
                            <Link
                              href={`/manhua/${m.slug ?? m._id}`}
                              className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              View
                            </Link>

                            {/* Chapters edit – editor талд байгаа гэж үзлээ */}
                            <Link
                              href={`manhuas/${m._id}/chapters`}
                              className="rounded-full border border-cyan-500/60 bg-cyan-500/10 px-2.5 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/20"
                            >
                              Chapters
                            </Link>

                            {/* Admin manage */}
                            <Link
                              href={`manhuas/${m._id}`}
                              className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Manage
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
