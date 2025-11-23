/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  views?: number;
  status: string;
}

interface Manhua {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  status: string;
  genres?: string[];
}

export default function AdminManhuaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [manhua, setManhua] = useState<Manhua | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        setLoading(true);
        const [mRes, cRes] = await Promise.all([
          api.get<Manhua>(`/manhuas/${slug}`),
          api.get<Chapter[]>(`/manhuas/${slug}/chapters`),
        ]);
        setManhua(mRes.data);
        setChapters(cRes.data);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            "Манхуа мэдээлэл ачаалахад алдаа гарлаа."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Манхуа ачаалж байна...
      </div>
    );
  }

  if (error || !manhua) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-sm text-red-400">
        <p>{error || "Манхуа олдсонгүй."}</p>
        <button
          onClick={() => router.push("/admin")}
          className="text-xs text-slate-300 underline-offset-2 hover:underline"
        >
          Admin dashboard руу буцах
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {manhua.coverImageUrl && (
            <img
              src={manhua.coverImageUrl}
              alt={manhua.title}
              className="h-20 w-16 rounded object-cover"
            />
          )}
          <div>
            <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
              {manhua.title}
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              {manhua.genres?.join(", ")}
            </p>
            <p className="mt-1 text-[11px] uppercase text-cyan-300">
              {manhua.status}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
          >
            ← Admin dashboard
          </Link>
          <Link
            href="/admin/chapters/new"
            className="rounded-full bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400"
          >
            + Chapter нэмэх
          </Link>
        </div>
      </div>

      {/* Chapters list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100 sm:text-base">
            Chapter-ууд
          </h2>
          <span className="text-[11px] text-slate-400">
            Нийт: {chapters.length}
          </span>
        </div>

        {chapters.length === 0 ? (
          <p className="text-xs text-slate-400">
            Одоогоор нэг ч chapter нэмэгдээгүй байна.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-900/90 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Гарчиг</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((ch) => (
                  <tr
                    key={ch._id}
                    className="border-t border-slate-800 hover:bg-slate-800/60"
                  >
                    <td className="px-3 py-2 text-slate-100">
                      {ch.chapterNumber}
                    </td>
                    <td className="px-3 py-2 text-slate-200">
                      {ch.title || `Chapter ${ch.chapterNumber}`}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          ch.status === "published"
                            ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                            : "bg-slate-800 text-slate-200 border border-slate-600/60"
                        }`}
                      >
                        {ch.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/chapters/${ch._id}`}
                        className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                      >
                        Засах
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
