"use client";

import { useRouter } from "next/navigation";

type ChapterNavProps = {
  slug: string;
  chapterNumber: number;
  hasPrev: boolean;
  hasNext: boolean;
  homePath?: string;
};

export function ChapterNav({
  slug,
  chapterNumber,
  hasPrev,
  hasNext,
  homePath = "/",
}: ChapterNavProps) {
  const router = useRouter();

  const goPrev = () => {
    if (!hasPrev || chapterNumber <= 1) {
      router.push(homePath);
      return;
    }
    router.push(`/manhua/${slug}/chapter/${chapterNumber - 1}`);
  };

  const goNext = () => {
    if (!hasNext) {
      router.push(homePath);
      return;
    }
    router.push(`/manhua/${slug}/chapter/${chapterNumber + 1}`);
  };

  // 🔥 Хэрэв prev, next хоёулаа байхгүй бол зөвхөн баруун талд ганц Home товч гаргана
  const bothHome = !hasPrev && !hasNext;

  return (
    <nav className="mx-auto my-3 flex max-w-3xl items-center justify-between gap-2 px-3 text-[15px] text-slate-200 sm:px-0">
      {/* LEFT SIDE */}
      {!bothHome && (
        <button
          onClick={goPrev}
          className="flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-[12px] hover:border-cyan-400 hover:text-cyan-300"
        >
          {hasPrev && chapterNumber > 1 ? (
            <>
              ← <span>Өмнөх chapter</span>
            </>
          ) : (
            <>
              🏠 <span>Home</span>
            </>
          )}
        </button>
      )}

      {/* RIGHT SIDE */}
      <button
        onClick={goNext}
        className="flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-[12px] hover:border-cyan-400 hover:text-cyan-300 ml-auto"
      >
        {bothHome ? (
          <>
            🏠 <span>Home</span>
          </>
        ) : hasNext ? (
          <>
            <span>Дараах chapter</span> →
          </>
        ) : (
          <>
            🏠 <span>Home</span>
          </>
        )}
      </button>
    </nav>
  );
}
