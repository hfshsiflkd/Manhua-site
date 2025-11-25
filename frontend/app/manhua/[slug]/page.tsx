/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/manhua/[slug]/page.tsx  (замаа өөрийн project-т тааруулаарай)
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getPublicChapters } from "@/lib/api";
import Link from "next/link";

interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  pages: ChapterPage[];
  views?: number;
}

interface Manhua {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  status: string;
  genres?: string[];
  author?: string;
  artist?: string;
  views?: number;
}

export default function ManhuaDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [manhua, setManhua] = useState<Manhua | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        const [mRes, chaptersData] = await Promise.all([
          api.get<Manhua>(`/manhuas/${slug}`),
          getPublicChapters(slug), // ✅ зөвхөн PUBLIC эндпоинт
        ]);

        setManhua(mRes.data);
        setChapters(
          (chaptersData || []).sort((a, b) => b.chapterNumber - a.chapterNumber)
        );
      } catch (e: any) {
        console.error(e);
        if (e.response?.status === 404) {
          router.push("/");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="h-40 w-28 animate-pulse rounded-xl bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-700" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!manhua) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        Манхуа олдсонгүй.
      </div>
    );
  }

  const coverSrc =
    manhua.coverImage || "https://via.placeholder.com/450x600?text=No+Cover";

  return (
    <div className="space-y-6">
      {/* HERO + BACKGROUND COVER */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-xl shadow-black/50">
        {/* Background image (cover) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${coverSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />

        {/* Foreground content */}
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr),minmax(0,1.9fr)] items-stretch">
            {/* LEFT: small cover card */}
            <div className="flex justify-center md:justify-start">
              <div className="relative w-28 sm:w-32 md:w-40 lg:w-44">
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverSrc}
                    alt={manhua.title}
                    className="h-auto w-full max-h-[380px] object-contain"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: info */}
            <div className="flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                  {manhua.title}
                </h1>

                {/* Genres */}
                {manhua.genres && manhua.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-200">
                    {manhua.genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Status + views */}
                <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
                  <span>
                    Статус:{" "}
                    <span className="font-medium text-cyan-300">
                      {manhua.status}
                    </span>
                  </span>
                  {manhua.views != null && (
                    <span>
                      Үзэлт:{" "}
                      <span className="font-medium text-slate-100">
                        {manhua.views.toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>

                {/* Description */}
                {manhua.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-100/90">
                    {manhua.description}
                  </p>
                )}

                {/* Author / Artist */}
                {(manhua.author || manhua.artist) && (
                  <div className="mt-2 grid gap-2 text-[12px] text-slate-300/90 sm:grid-cols-2">
                    {manhua.author && (
                      <p>
                        Author:{" "}
                        <span className="font-medium text-slate-50">
                          {manhua.author}
                        </span>
                      </p>
                    )}
                    {manhua.artist && (
                      <p>
                        Artist:{" "}
                        <span className="font-medium text-slate-50">
                          {manhua.artist}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* CTA buttons */}
              {chapters.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/manhua/${manhua.slug}/chapter/${chapters[0].chapterNumber}`}
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow shadow-cyan-500/40 hover:from-cyan-400 hover:to-emerald-300"
                  >
                    Read latest – Ch. {chapters[0].chapterNumber}
                  </Link>
                  <a
                    href="#chapters"
                    className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-900"
                  >
                    Бүх chapter-уудыг харах
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTERS LIST */}
      <section id="chapters" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Chapters
          </h2>
          {chapters.length > 0 && (
            <span className="text-[11px] text-slate-500">
              Нийт {chapters.length} chapter
            </span>
          )}
        </div>

        {chapters.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-center text-xs text-slate-400">
            Одоогоор chapter нэмэгдээгүй байна.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40">
            <ul className="divide-y divide-slate-800/80 text-[13px]">
              {chapters.map((ch) => (
                <li key={ch._id}>
                  <Link
                    href={`/manhua/${slug}/chapter/${ch.chapterNumber}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-900/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-cyan-300">
                        Ch. {ch.chapterNumber}
                      </span>
                      <span className="line-clamp-1 text-[13px] text-slate-100">
                        {ch.title || `Chapter ${ch.chapterNumber}`}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {ch.pages?.length || 0} pages
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
