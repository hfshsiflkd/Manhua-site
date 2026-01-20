"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isChapterRead } from "@/lib/useReadState";

interface ContinueReadingProps {
  bookmark?: {
    _id: string;
    manhua: {
      _id: string;
      title: string;
      slug: string;
      coverImageUrl?: string;
      coverImage?: string;
    };
    chapterNumber: number;
    pageNumber: number;
    updatedAt: string;
  } | null;
  totalChapters?: number;
}

export function ContinueReading({
  bookmark,
  totalChapters,
}: ContinueReadingProps) {
  const router = useRouter();

  if (!bookmark) {
    return (
      <div className="rounded-3xl bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/25 to-slate-800/10 p-[1px] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4 text-center backdrop-blur">
          <p className="text-sm text-slate-400">
            Та одоогоор уншиж эхлээгүй байна
          </p>
          <button
            onClick={() => router.push("/manhuas")}
            className="mt-3 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/25 transition-all hover:brightness-110"
          >
            Манхуа сонгох
          </button>
        </div>
      </div>
    );
  }

  const cover = bookmark.manhua.coverImageUrl || bookmark.manhua.coverImage;
  const progress =
    totalChapters && totalChapters > 0
      ? Math.round((bookmark.chapterNumber / totalChapters) * 100)
      : null;
  const isRead = isChapterRead(bookmark.manhua.slug, bookmark.chapterNumber);

  const handleResume = () => {
    router.push(
      `/manhua/${bookmark.manhua.slug}/chapter/${bookmark.chapterNumber}`
    );
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/25 to-yellow-400/20 p-[1px] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Уншиж буй манхуа
          </h3>
          <button
            onClick={handleResume}
            className="rounded-full bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/25"
          >
            Үргэлжлүүлэх
          </button>
        </div>

      <div className="flex gap-4">
        {/* Cover */}
        <Link
          href={`/manhua/${bookmark.manhua.slug}`}
          className="shrink-0"
        >
          <div className="relative h-20 w-14 overflow-hidden rounded-lg bg-slate-800 ring-1 ring-slate-700/60 shadow-md shadow-black/40">
            {cover ? (
              <Image
                src={cover}
                alt={bookmark.manhua.title}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                No cover
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <Link
            href={`/manhua/${bookmark.manhua.slug}`}
            className="block"
          >
            <h4 className="line-clamp-2 text-sm font-semibold text-slate-100 hover:text-cyan-300 transition-colors">
              {bookmark.manhua.title}
            </h4>
          </Link>

          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  isRead
                    ? "text-gray-500 font-normal"
                    : "text-gray-300 font-medium"
                }`}
              >
                Chapter {bookmark.chapterNumber}
              </span>
              {isRead && (
                <span className="text-[10px] text-gray-600">(уншсан)</span>
              )}
            </div>

            {/* Progress Bar */}
            {progress !== null && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {progress}% дууслаа
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

