"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
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
  coverImageUrl?: string;
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
        const [mRes, cRes] = await Promise.all([
          api.get<Manhua>(`/manhuas/${slug}`),
          api.get<Chapter[]>(`/manhuas/${slug}/chapters`),
        ]);
        setManhua(mRes.data);
        setChapters(
          (cRes.data || []).sort((a, b) => b.chapterNumber - a.chapterNumber)
        );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    return <div className="text-sm text-red-400">Манхуа олдсонгүй</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <section className="flex gap-4">
        <div className="w-28 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <img
            src={manhua.coverImageUrl || "https://via.placeholder.com/300x400"}
            alt={manhua.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 space-y-2 text-sm text-slate-200">
          <h1 className="text-lg font-semibold text-slate-50">
            {manhua.title}
          </h1>
          <p className="text-[12px] text-slate-400">
            {manhua.genres?.join(" • ")}
          </p>
          <p className="text-[12px] text-slate-400">
            Статус:{" "}
            <span className="text-cyan-300 font-medium">
              {manhua.status}
            </span>
          </p>
          <p className="line-clamp-3 text-[12px] text-slate-300">
            {manhua.description}
          </p>
        </div>
      </section>

      {/* Chapters list – зөвхөн Chapter 1, 2, 3... */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Chapters
        </h2>
        {chapters.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-center text-xs text-slate-400">
            Одоогоор chapter нэмэгдээгүй байна.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70">
            <ul className="divide-y divide-slate-800 text-[13px]">
              {chapters.map((ch) => (
                <li key={ch._id}>
                  <Link
                    href={`/manhua/${slug}/chapter/${ch.chapterNumber}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-cyan-300">
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
