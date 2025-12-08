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

// Нэг манхуа-картын UI (board)
function ManhuaBoardCard({
  manhua,
  badge,
  subtitle,
}: {
  manhua: Manhua;
  badge?: string;
  subtitle?: string;
}) {
  // аль нэг нь байж магадгүй гэдгийг тааж байна – байхгүй бол fallback
  const latestChapterNumber =
    // @ts-ignore
    manhua.latestChapterNumber ??
   
    manhua.lastChapterNumber ??
    // @ts-ignore
    manhua.lastChapter?.chapterNumber ??
    undefined;

  const latestChapterTitle =
    // @ts-ignore
    manhua.latestChapterTitle ??
    // @ts-ignore
    manhua.lastChapterTitle ??
    // @ts-ignore
    manhua.lastChapter?.title ??
    undefined;

  // rating байж магадгүй
  const ratingValue =
    // @ts-ignore
    typeof manhua.rating === "number" ? manhua.rating : undefined;

  return (
    <Link
      href={`/manhua/${manhua.slug}`}
      className="group flex gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-sm shadow-slate-900/80 transition hover:border-cyan-500/60 hover:bg-slate-900 active:scale-[0.98]"
    >
      {/* Cover */}
      <div className="relative h-24 w-18 min-w-[72px] overflow-hidden rounded-xl sm:h-28 sm:min-w-[84px]">
        <img
          src={manhua.coverImage || "https://via.placeholder.com/300x400"}
          alt={manhua.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-110"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent" />
        {badge && (
          <div className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-slate-950/90 px-2 py-0.5 text-[9px] font-semibold text-cyan-300 ring-1 ring-cyan-500/40">
            {badge}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="space-y-1">
          <p className="line-clamp-2 text-[13px] font-semibold text-slate-50 sm:text-[14px]">
            {manhua.title}
          </p>

          {subtitle && (
            <p className="text-[10px] uppercase tracking-wide text-cyan-300/80">
              {subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            {latestChapterNumber ? (
              <span className="rounded-full bg-slate-900/90 px-2 py-0.5">
                Сүүлчийн chapter:{" "}
                <span className="font-semibold text-slate-100">
                  Ch. {latestChapterNumber}
                </span>
              </span>
            ) : (
              <span className="rounded-full bg-slate-900/90 px-2 py-0.5">
                Chapter мэдээлэл нэмэгдээгүй
              </span>
            )}

            {latestChapterTitle && (
              <span className="line-clamp-1 text-[10px] text-slate-400">
                {latestChapterTitle}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          {/* Rating */}
          <span className="flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-0.5">
            <span className="text-[11px] text-amber-300">★</span>
            <span className="font-semibold text-slate-100">
              {ratingValue ? ratingValue.toFixed(1) : "—"}
            </span>
            <span className="text-slate-500">/ 5</span>
          </span>

          {/* Genres */}
          {manhua.genres && manhua.genres.length > 0 && (
            <span className="line-clamp-1 text-[10px] text-slate-400">
              {manhua.genres.slice(0, 2).join(" • ")}
            </span>
          )}

          {/* Status */}
          {manhua.status && (
            <span className="ml-auto rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-300">
              {manhua.status}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
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
      <div className="mx-auto max-w-5xl space-y-6 px-3 pt-6 pb-20 sm:px-4">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-cyan-500/10">
          <div className="h-5 w-32 animate-pulse rounded-xl bg-slate-700" />
          <div className="mt-3 h-7 w-2/3 animate-pulse rounded-xl bg-slate-800" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-lg bg-slate-800" />
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3"
            >
              <div className="h-24 w-18 animate-pulse rounded-xl bg-slate-800 sm:h-28" />
              <div className="flex flex-1 flex-col justify-between space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
                <div className="flex gap-2">
                  <div className="h-4 w-20 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-4 w-16 animate-pulse rounded-full bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-3 pt-6 pb-20 sm:px-4">
      {/* HERO – богино, цэвэрхэн */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 shadow-xl shadow-cyan-500/20">
        {/* background glow */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 md:max-w-md">
            <p className="inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-medium text-cyan-300 ring-1 ring-cyan-500/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Монгол манхуа уншигч · Beta
            </p>

            <h1 className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-[22px] font-bold leading-snug text-transparent sm:text-[26px]">
              Халаасанд чинь багтсан
              <br />
              манхуа номын сан 📚
            </h1>

            <p className="text-[13px] leading-relaxed text-slate-300">
              Монгол орчуулгатай манхуа, сүүлд уншсан chapter-аасаа шууд
              үргэлжлүүлэн унших, favorite цуглуулгаа нэг газар хөтлөх
              боломжтой.
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Link
                href="/profile"
                className="rounded-2xl bg-cyan-500 px-4 py-2 text-[13px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 transition active:scale-[0.98]"
              >
                Сүүлд уншсанаасаа үргэлжлүүлэх
              </Link>
              <Link
                href="#latest"
                className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-[12px] font-medium text-slate-100 transition active:scale-[0.98]"
              >
                Шинээр нэмэгдсэн манхуа
              </Link>
            </div>
          </div>

          <div className="mt-2 hidden flex-1 justify-end md:flex">
            <div className="relative h-32 w-40 rounded-3xl border border-slate-700 bg-slate-950/80 p-2 shadow-lg shadow-slate-950/80">
              <div className="absolute -left-4 top-4 h-6 w-16 rounded-full bg-slate-900/80" />
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-900/90">
                <div className="absolute inset-3 rounded-xl border border-dashed border-slate-700" />
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400">
                  Манхуа preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT BOARD – Trending + Latest */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* TRENDING BOARD */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-200">
                🔥 Trending манхуа
              </h2>
              <p className="text-[11px] text-slate-400">
                Сүүлийн өдрүүдэд хамгийн их уншигдсан цувралууд
              </p>
            </div>
          </div>

          {trending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-6 text-center text-[12px] text-slate-400">
              Одоогоор trending манхуа алга байна.
            </div>
          ) : (
            <div className="space-y-3">
              {trending.map((m, idx) => (
                <ManhuaBoardCard
                  key={m._id}
                  manhua={m}
                  badge={`#${idx + 1} Trending`}
                  subtitle="Хамгийн их уншигдсан"
                />
              ))}
            </div>
          )}
        </div>

        {/* LATEST BOARD */}
        <div id="latest" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-200">
                🆕 Сүүлд нэмэгдсэн
              </h2>
              <p className="text-[11px] text-slate-400">
                Шинэ цуврал эсвэл шинэ chapter нэмэгдсэн манхуа
              </p>
            </div>
          </div>

          {latest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-6 text-center text-[12px] text-slate-400">
              Одоогоор манхуа бүртгэлгүй байна. Admin хэсгээс эхний манхуагаа
              нэмээрэй.
            </div>
          ) : (
            <div className="space-y-3">
              {latest.map((m) => (
                <ManhuaBoardCard
                  key={m._id}
                  manhua={m}
                  subtitle="Шинээр нэмэгдсэн"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
