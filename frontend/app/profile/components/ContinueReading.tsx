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
      <div className="pt-6 pb-4 text-center border-b border-slate-800/50">
        <p className="text-sm text-slate-400">
          Та одоогоор уншиж эхлээгүй байна
        </p>
        <button
          onClick={() => router.push("/manhuas")}
          className="mt-3 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Манхуа сонгох
        </button>
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
    <div className="pt-6 pb-4 border-b border-slate-800/50">
      <h3 className="mb-4 text-sm font-medium text-slate-400">
        Уншиж буй манхуа
      </h3>

      <div className="flex gap-3">
        {/* Cover */}
        <Link
          href={`/manhua/${bookmark.manhua.slug}`}
          className="shrink-0"
        >
          <div className="relative h-20 w-14 overflow-hidden rounded-lg bg-slate-800">
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
            <h4 className="line-clamp-2 text-sm font-medium text-slate-100 hover:text-cyan-400 transition-colors">
              {bookmark.manhua.title}
            </h4>
          </Link>

          <div className="mt-1.5 space-y-1.5">
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
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {progress}% дууслаа
                </p>
              </div>
            )}

            {/* Resume Button */}
            <button
              onClick={handleResume}
              className="mt-2 w-full rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 active:scale-95"
            >
              Үргэлжлүүлэх
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

