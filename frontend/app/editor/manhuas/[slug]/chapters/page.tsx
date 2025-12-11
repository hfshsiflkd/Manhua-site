/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import EditorShell from "../../components/EditorShell";
import { editorGetChapters } from "@/lib/api";
import type { Chapter } from "@/types/manhua";

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
          // ✨ editor login руу
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

  // ➕ Add Chapter руу үсрэх handler
  function handleGoToNewChapter() {
    if (!slug) return;
    router.push(`/editor/manhuas/${slug}/chapters/new`);
    // Жишээ: watashi1 бол /editor/manhuas/watashi1/chapters/new
  }

  return (
    <EditorShell
      title={`Chapters – ${slug}`}
      subtitle="Өөрийн манхуа-ны chapter-уудыг эндээс удирдана."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push("/editor/manhuas")}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            ← My Manhuas руу
          </button>

          {/* ➕ Шинэ Chapter үүсгэх хуудас руу үсрэх товч */}
          <button
            type="button"
            onClick={handleGoToNewChapter}
            className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
          >
            + Add Chapter
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">
            Chapter-ууд ачаалж байна...
          </div>
        ) : chapters.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-center text-xs text-slate-400">
            Одоогоор chapter нэмэгдээгүй байна.
            <div className="mt-3">
              <button
                type="button"
                onClick={handleGoToNewChapter}
                className="rounded-lg border border-cyan-500 bg-cyan-600 px-3 py-1.5 text-[11px] text-white hover:bg-cyan-500"
              >
                + Эхний Chapter-аа үүсгэх
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <ul className="divide-y divide-slate-800 text-xs">
              {chapters.map((ch) => (
                <li
                  key={ch._id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/70"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-cyan-300">
                      Ch. {ch.chapterNumber}
                    </span>
                    <span className="text-[12px] text-slate-100 line-clamp-1">
                      {ch.title || `Chapter ${ch.chapterNumber}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{ch.pages?.length || 0} pages</span>
                    <Link
                      href={`/editor/manhuas/${slug}/chapters/${ch._id}`}
                      className="text-cyan-300 hover:text-cyan-200"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </EditorShell>
  );
}
