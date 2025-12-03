// frontend/src/app/editor/manhuas/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { editorGetMyManhuas, editorUpdateManhua, Manhua } from "@/lib/api";
import EditorShell from "./components/EditorShell";

export default function EditorManhuasPage() {
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadManhuas() {
    try {
      setLoading(true);
      const data = await editorGetMyManhuas();
      setManhuas(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error("[EditorManhuas] load error:", e);
      setError(e?.response?.data?.message || "Manhuas ачаалж чадсангүй");
      setManhuas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManhuas();
  }, []);

  const handleToggleStatus = async (m: Manhua) => {
    const newStatus =
      m.status === "completed"
        ? "ongoing"
        : m.status === "ongoing"
        ? "hiatus"
        : "completed";

    try {
      setTogglingId(m._id);
      await editorUpdateManhua(m._id, { status: newStatus });
      await loadManhuas();
    } catch (e: any) {
      console.error("[EditorManhuas] toggle status error:", e);
      setError(e?.response?.data?.message || "Status солих үед алдаа гарлаа");
    } finally {
      setTogglingId(null);
    }
  };

  const prettyStatus = (status?: string) => {
    switch (status) {
      case "ongoing":
        return "Ongoing";
      case "completed":
        return "Completed";
      case "hiatus":
        return "Hiatus";
      default:
        return "Unknown";
    }
  };

  const statusClasses = (status?: string) => {
    switch (status) {
      case "ongoing":
        return "bg-emerald-500/12 text-emerald-200 border border-emerald-500/40";
      case "completed":
        return "bg-sky-500/12 text-sky-200 border border-sky-500/40";
      case "hiatus":
        return "bg-amber-500/12 text-amber-200 border border-amber-500/40";
      default:
        return "bg-slate-700/70 text-slate-200 border border-slate-600/70";
    }
  };

  return (
    <EditorShell
      title="My Manhuas"
      subtitle="Өөрийн нэмсэн манхуа-гаа жагсааж, статус, chapters болон public page-ээ удирдана."
    >
      <div className="space-y-4">
        {/* Top actions / info */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-400">
            Энд зөвхөн{" "}
            <span className="font-medium text-slate-200">чиний нэмсэн</span>{" "}
            манхуа-ууд харагдана.
          </p>
          <Link
            href="/editor/manhuas/new"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 transition"
          >
            + New manhua
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Table / list */}
        {loading ? (
          <div className="text-sm text-slate-400">Manhuas ачаалж байна...</div>
        ) : manhuas.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-400">
            Одоогоор чи манхуа нэмээгүй байна.{" "}
            <Link
              href="/editor/manhuas/new"
              className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
            >
              Эхнийхээ нэмээрэй.
            </Link>
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
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400">
                      Updated
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
                    const updated =
                      (m as any).updatedAt || (m as any).createdAt;
                    const updatedStr = updated
                      ? new Date(updated).toLocaleDateString()
                      : "-";

                    const publicUrl = `/manhua/${m.slug ?? m._id}`;
                    const editorChaptersUrl = m.slug
                      ? `/editor/manhuas/${m.slug}/chapters`
                      : undefined; // slug байхгүй бол chapters button disable

                    return (
                      <tr
                        key={m._id}
                        className="border-t border-slate-800/70 hover:bg-slate-900/80"
                      >
                        {/* TITLE */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-slate-100 line-clamp-1">
                              {m.title}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {m.slug ? (
                                <>
                                  /manhua/
                                  <span className="font-mono">{m.slug}</span>
                                </>
                              ) : (
                                <span className="font-mono">
                                  ID: {m._id.slice(0, 8)}…
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] ${statusClasses(
                              m.status
                            )}`}
                          >
                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                            {prettyStatus(m.status)}
                          </span>
                        </td>

                        {/* UPDATED */}
                        <td className="px-4 py-3 align-top text-[11px] text-slate-400">
                          {updatedStr}
                        </td>

                        {/* GENRES */}
                        <td className="px-4 py-3 align-top text-[11px] text-slate-400">
                          {m.genres && m.genres.length > 0
                            ? m.genres.join(", ")
                            : "-"}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {/* Public view */}
                            <Link
                              href={publicUrl}
                              className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              View
                            </Link>

                            {/* Chapters (admin/editor manage) */}
                            {editorChaptersUrl ? (
                              <Link
                                href={editorChaptersUrl}
                                className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                              >
                                Chapters
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[10px] text-slate-500"
                              >
                                No slug
                              </button>
                            )}

                            {/* Status toggle */}
                            <button
                              onClick={() => handleToggleStatus(m)}
                              disabled={togglingId === m._id}
                              className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-2.5 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
                            >
                              {togglingId === m._id
                                ? "Changing..."
                                : "Cycle status"}
                            </button>
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
    </EditorShell>
  );
}
