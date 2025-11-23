"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
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

export default function AdminChaptersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        const res = await api.get<Chapter[]>(
          `/manhuas/${slug}/chapters`
        );
        setChapters(res.data);
      } catch (e: any) {
        console.error(e);
        if (e.response?.status === 401 || e.response?.status === 403) {
          router.push("/admin/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router]);

  if (loading) return <div>Уншиж байна...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-100">
          Chapter-ууд ({slug})
        </h1>
        <Link
          href={`/admin/manhuas/${slug}/chapters/new`}
          className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
        >
          + Шинэ chapter
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Chapter</th>
              <th className="px-3 py-2 text-left">Гарчиг</th>
              <th className="px-3 py-2 text-left">Pages</th>
              <th className="px-3 py-2 text-left">Views</th>
              <th className="px-3 py-2 text-right">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {chapters
              .slice()
              .sort((a, b) => a.chapterNumber - b.chapterNumber)
              .map((ch) => (
                <tr
                  key={ch._id}
                  className="border-t border-slate-800 hover:bg-slate-800/60"
                >
                  <td className="px-3 py-2">Ch. {ch.chapterNumber}</td>
                  <td className="px-3 py-2">{ch.title}</td>
                  <td className="px-3 py-2">{ch.pages?.length || 0}</td>
                  <td className="px-3 py-2">{ch.views || 0}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/manhuas/${slug}/chapters/${ch._id}`}
                      className="text-[11px] text-cyan-300 hover:text-cyan-200"
                    >
                      Edit pages
                    </Link>
                  </td>
                </tr>
              ))}
            {chapters.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-slate-400"
                >
                  Одоогоор chapter алга.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
