/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  totalVIP: number;
  totalManhuas: number;
  totalChapters: number;
  views?: number;
}

interface Manhua {
  _id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  status: string;
  genres?: string[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingManhuas, setLoadingManhuas] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, manhuaRes] = await Promise.all([
          api.get<AdminStats>("/admin/stats"),
          api.get<{ items: Manhua[] }>("/manhuas", {
            params: { page: 1, limit: 8 },
          }),
        ]);

        setStats(statsRes.data);
        setManhuas(manhuaRes.data.items || []);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          router.push("/admin/login");
        } else {
          console.error(err);
        }
      } finally {
        setLoadingStats(false);
        setLoadingManhuas(false);
      }
    }

    load();
  }, [router]);

  if (loadingStats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Admin dashboard ачаалж байна...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-400">
        Статистик ачаалж чадсангүй.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Системийн үндсэн үзүүлэлтүүд, хэрэглэгчид ба контентын статистик.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
            ● Online
          </span>
          <span className="hidden md:inline text-slate-500">
            /api/admin/stats
          </span>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-900/70">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Нийт хэрэглэгч
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">
            {stats.totalUsers}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            Бүртгэлтэй бүх хэрэглэгч.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-lg shadow-amber-900/40">
          <p className="text-[11px] uppercase tracking-wide text-amber-200">
            VIP хэрэглэгч
          </p>
          <p className="mt-2 text-3xl font-semibold text-amber-100">
            {stats.totalVIP}
          </p>
          <p className="mt-1 text-[12px] text-amber-200/80">
            Төлбөртэй, VIP эрхтэй хэрэглэгч.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 shadow-lg shadow-sky-900/40">
          <p className="text-[11px] uppercase tracking-wide text-sky-200">
            Манхуа
          </p>
          <p className="mt-2 text-3xl font-semibold text-sky-100">
            {stats.totalManhuas}
          </p>
          <p className="mt-1 text-[12px] text-sky-200/80">
            Системд байгаа series–ийн тоо.
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 shadow-lg shadow-violet-900/40">
          <p className="text-[11px] uppercase tracking-wide text-violet-200">
            Chapter
          </p>
          <p className="mt-2 text-3xl font-semibold text-violet-100">
            {stats.totalChapters}
          </p>
          <p className="mt-1 text-[12px] text-violet-200/80">
            Нийт нэмэгдсэн бүлгүүд.
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/manhuas"
          className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70 hover:border-cyan-400/70 hover:bg-slate-900"
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            CONTENT
          </p>
          <p className="mt-1 text-base font-semibold text-slate-50">
            Манхуа удирдах
          </p>
          <p className="mt-1 text-[12px] text-slate-400">
            Нэмэх, засах, статус өөрчлөх.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70 hover:border-amber-400/70 hover:bg-slate-900"
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            USERS
          </p>
          <p className="mt-1 text-base font-semibold text-slate-50">
            Хэрэглэгчид & VIP
          </p>
          <p className="mt-1 text-[12px] text-slate-400">
            Role тохируулах, VIP хугацаа сунгах.
          </p>
        </Link>
      </section>

      {/* Recent Manhuas on Dashboard */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100 sm:text-base">
            Сүүлд нэмэгдсэн манхуа
          </h2>
          <Link
            href="/admin/manhuas"
            className="text-[11px] text-cyan-400 hover:text-cyan-300"
          >
            Бүгдийг харах →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
          {loadingManhuas ? (
            <p className="text-xs text-slate-400">Манхуа ачаалж байна...</p>
          ) : manhuas.length === 0 ? (
            <p className="text-xs text-slate-400">
              Одоогоор манхуа бүртгэгдээгүй байна.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {manhuas.map((m) => (
                <div
                  key={m._id}
                  className="group rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-xs shadow-sm shadow-slate-900/50 hover:border-cyan-400/50"
                >
                  <div className="flex gap-2">
                    <img
                      src={
                        m.coverImageUrl ||
                        "https://via.placeholder.com/100x150?text=No+Cover"
                      }
                      alt={m.title}
                      className="h-20 w-14 rounded object-cover"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="line-clamp-2 text-[12px] font-semibold text-slate-100">
                        {m.title}
                      </p>
                      <p className="line-clamp-1 text-[10px] text-slate-400">
                        {m.genres?.join(", ") || "No genres"}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          m.status === "published"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-slate-700 text-slate-200"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <Link
                      href={`/admin/manhuas/${m.slug}`}
                      className="rounded-full bg-slate-800 px-3 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/manhua/${m.slug}`}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Views (optional) */}
      {typeof stats.views === "number" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Нийт уншсан тоо (views)
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">
            {stats.views.toLocaleString("en-US")}
          </p>
        </section>
      )}
    </div>
  );
}
