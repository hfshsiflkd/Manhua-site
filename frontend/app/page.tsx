// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Manhua } from "@/types/manhua";
import Link from "next/link";

interface ManhuaListResponse {
  items: Manhua[];
  total: number;
  page: number;
  limit: number;
}

export default function HomePage() {
  const [trending, setTrending] = useState<Manhua[]>([]);
  const [latest, setLatest] = useState<Manhua[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [trendRes, latestRes] = await Promise.all([
          api.get<Manhua[]>("/stats/trending?limit=8"),
          api.get<ManhuaListResponse>("/manhuas?limit=12&page=1"),
        ]);
        setTrending(trendRes.data);
        setLatest(latestRes.data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-3 pt-4 pb-16 sm:max-w-3xl sm:px-4">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-cyan-500/10">
          <div className="h-6 w-3/4 animate-pulse rounded-xl bg-slate-700" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-lg bg-slate-800" />
        </section>

        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-700" />
          <div className="flex gap-3 overflow-x-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="min-w-[140px] rounded-2xl border border-slate-800 bg-slate-900/70 p-2"
              >
                <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-slate-800" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-10 px-3 pt-4 pb-20 sm:max-w-3xl sm:px-4">
      {/* MOBILE HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-4 shadow-xl shadow-cyan-500/20">
        {/* background blobs */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-cyan-300 ring-1 ring-cyan-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live · Монгол манхуа reader
          </p>

          <h1 className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-[22px] font-bold leading-snug text-transparent sm:text-2xl">
            Халаасандаа багтсан
            <br />
            манхуа уншигч 📱
          </h1>

          <p className="text-[13px] leading-relaxed text-slate-300">
            Монгол орчуулгатай манхуа, сүүлд уншсан хэсгээ шууд үргэлжлүүлэх,
            favorite-уудаа нэг дороос хянах боломжтой.
          </p>

          <div className="mt-2 flex items-center gap-2">
            <Link
              href="/profile"
              className="flex-1 rounded-2xl bg-cyan-500 px-4 py-2 text-center text-[13px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 active:scale-[0.98]"
            >
              Сүүлд уншсанаасаа үргэлжлүүлэх
            </Link>
            <Link
              href="#latest"
              className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-[12px] font-medium text-slate-100 active:scale-[0.98]"
            >
              Шинэхэн манхуа
            </Link>
          </div>
        </div>
      </section>

      {/* TRENDING – horizontal scroll, mobile first */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-200">
              🔥 Trending
            </h2>
            <p className="text-[11px] text-slate-400">
              Сүүлийн хоногуудад хамгийн их уншигдсан
            </p>
          </div>
        </div>

        {trending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-4 py-6 text-center text-[12px] text-slate-400">
            Одоогоор trending манхуа алга байна.
          </div>
        ) : (
          <div className="-mx-3 flex gap-3 overflow-x-auto px-1 pb-1 pt-1 sm:mx-0 sm:px-0">
            {trending.map((m, idx) => (
              <Link
                key={m._id}
                href={`/manhua/${m.slug}`}
                className="group relative min-w-[145px] max-w-[160px] snap-start rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm shadow-slate-900/80 transition active:scale-[0.98]"
              >
                {/* rank pill */}
                <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-slate-950/85 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 ring-1 ring-cyan-500/40">
                  <span>#{idx + 1}</span>
                </div>

                <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl">
                  <img
                    src={
                      m.coverImageUrl || "https://via.placeholder.com/300x400"
                    }
                    alt={m.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-110"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent" />
                </div>
                <div className="relative space-y-0.5 px-2 pb-2 pt-1.5">
                  <p className="line-clamp-2 text-[12px] font-semibold text-slate-50">
                    {m.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-900/90 px-2 py-0.5 text-[10px] uppercase text-cyan-300">
                      {m.status}
                    </span>
                    {m.genres && m.genres.length > 0 && (
                      <span className="line-clamp-1 text-[10px] text-slate-400">
                        {m.genres.slice(0, 2).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* LATEST – grid, but mobile-friendly */}
      <section id="latest" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-200">
              🆕 Сүүлд нэмэгдсэн
            </h2>
            <p className="text-[11px] text-slate-400">
              Шинэ chapter/series нэмэгдсэн манхуа
            </p>
          </div>
        </div>

        {latest.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-4 py-6 text-center text-[12px] text-slate-400">
            Одоогоор манхуа бүртгэлгүй байна. Admin хэсгээс эхний манхуагаа
            нэмээрэй.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {latest.map((m) => (
              <Link
                key={m._id}
                href={`/manhua/${m.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm transition active:scale-[0.98]"
              >
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={
                      m.coverImageUrl || "https://via.placeholder.com/300x400"
                    }
                    alt={m.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-0.5 px-2 pb-2 pt-1.5">
                  <p className="line-clamp-2 text-[12px] font-semibold text-slate-100">
                    {m.title}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {m.genres?.slice(0, 2).join(", ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
