/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { editorGetChapters } from "@/lib/api";
import type { Chapter } from "@/types/manhua";
import EmptyState from "../../../components/EmptyState";
import { TableSkeleton } from "../../../components/LoadingSkeleton";

export default function EditorChaptersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        setLoading(true);
        const data = await editorGetChapters(slug);
        setChapters(Array.isArray(data) ? data : []);
        setError(null);
      } catch (e: any) {
        console.error("[EditorChapters] load error:", e);
        if (e?.response?.status === 401) {
          router.push("/login");
          return;
        }
        if (e?.response?.status === 403) {
          setError("Энэ манхуа дээр ажиллах зөвшөөрөлгүй байна.");
        } else {
          setError("Chapter-ууд ачаалж чадсангүй.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug, router]);

  const getStatusBadge = (status?: string) => {
    if (status === "published") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-200 border border-emerald-500/40">
          Published
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-medium text-amber-200 border border-amber-500/40">
        Draft
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => router.push("/editor/manhuas")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              ← My Manhuas
            </button>
            <span className="text-sm text-slate-400">/</span>
            <span className="text-sm font-mono text-slate-300">{slug}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">Chapters</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Манхуа-ны chapter-уудыг эндээс удирдана.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/editor/manhuas/${slug}/chapters/new`)}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 transition whitespace-nowrap w-full sm:w-auto"
        >
          + Add Chapter
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <TableSkeleton />
      ) : chapters.length === 0 ? (
        <EmptyState
          title="Одоогоор chapter алга"
          description="Эхний chapter-аа үүсгэж эхлээрэй."
          action={{
            label: "+ Эхний Chapter үүсгэх",
            href: `/editor/manhuas/${slug}/chapters/new`,
          }}
          icon="📖"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/40">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Chapter
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Pages
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                  {chapters.map((ch) => {
                  const createdAt = ch.createdAt
                    ? new Date(ch.createdAt).toLocaleDateString("mn-MN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "-";

                  return (
                    <tr
                      key={ch._id}
                      className="hover:bg-slate-900/80 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center justify-center rounded-full bg-cyan-500/12 px-3 py-1 text-xs font-bold text-cyan-200 border border-cyan-500/40">
                          Ch. {ch.chapterNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-100">
                          {ch.title || `Chapter ${ch.chapterNumber}`}
                        </p>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(ch.status)}</td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-slate-400">
                          {ch.pages?.length || 0} pages
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-slate-400">
                          {createdAt}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/editor/manhuas/${slug}/chapters/${ch._id}`}
                            className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition"
                          >
                            Edit
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

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {chapters.map((ch) => {
              const createdAt = ch.createdAt
                ? new Date(ch.createdAt).toLocaleDateString("mn-MN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "-";

              return (
                <div
                  key={ch._id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center rounded-full bg-cyan-500/12 px-3 py-1 text-xs font-bold text-cyan-200 border border-cyan-500/40">
                          Ch. {ch.chapterNumber}
                        </span>
                        {getStatusBadge(ch.status)}
                      </div>
                      <p className="text-sm font-medium text-slate-100 mb-1">
                        {ch.title || `Chapter ${ch.chapterNumber}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{ch.pages?.length || 0} pages</span>
                        <span>•</span>
                        <span>{createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/editor/manhuas/${slug}/chapters/${ch._id}`}
                    className="block w-full rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition text-center"
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Stats */}
      {!loading && chapters.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-400">
          Нийт <span className="font-semibold text-slate-200">{chapters.length}</span> chapter
          {chapters.filter((ch) => ch.status === "published").length > 0 && (
            <>
              {" "}
              (
              <span className="font-semibold text-slate-200">
                {chapters.filter((ch) => ch.status === "published").length}
              </span>{" "}
              published)
            </>
          )}
        </div>
      )}
    </div>
  );
}
