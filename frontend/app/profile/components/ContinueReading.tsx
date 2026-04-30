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

export function ContinueReading({ bookmark, totalChapters }: ContinueReadingProps) {
  const router = useRouter();

  if (!bookmark) {
    return (
      <div
        className="rounded-[14px] p-5 text-center"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <p className="text-[13px] mb-3" style={{ color: "var(--arc-dim)" }}>Та одоогоор уншиж эхлээгүй байна</p>
        <button
          onClick={() => router.push("/manhuas")}
          className="rounded-[9px] px-4 py-2 text-[13px] font-semibold"
          style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
        >
          Манхуа сонгох
        </button>
      </div>
    );
  }

  const cover = bookmark.manhua.coverImageUrl || bookmark.manhua.coverImage;
  const progress = totalChapters && totalChapters > 0
    ? Math.round((bookmark.chapterNumber / totalChapters) * 100)
    : null;
  const isRead = isChapterRead(bookmark.manhua.slug, bookmark.chapterNumber);

  return (
    <div
      className="rounded-[14px] p-4"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-[16px] rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px var(--arc-cyan-glow)" }} />
          <h3 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Уншиж буй манхуа
          </h3>
        </div>
        <button
          onClick={() => router.push(`/manhua/${bookmark.manhua.slug}/chapter/${bookmark.chapterNumber}`)}
          className="rounded-[7px] px-3 py-1 text-[11px] font-semibold transition-colors"
          style={{ background: "var(--arc-cyan-dim)", border: "1px solid oklch(0.72 0.17 195/.2)", color: "var(--arc-cyan)", cursor: "pointer" }}
        >
          Үргэлжлүүлэх
        </button>
      </div>

      <div className="flex gap-3">
        <Link href={`/manhua/${bookmark.manhua.slug}`} className="shrink-0">
          <div
            className="relative overflow-hidden"
            style={{ width: 44, height: 60, borderRadius: 7, background: "var(--arc-elevated)" }}
          >
            {cover ? (
              <Image src={cover} alt={bookmark.manhua.title} fill sizes="44px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px]" style={{ color: "var(--arc-muted)" }}>No cover</div>
            )}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/manhua/${bookmark.manhua.slug}`}>
            <h4
              className="line-clamp-2 text-[13px] font-semibold transition-colors mb-1"
              style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
            >
              {bookmark.manhua.title}
            </h4>
          </Link>

          <p className="text-[11px] mb-2" style={{ color: isRead ? "var(--arc-muted)" : "var(--arc-dim)" }}>
            Chapter {bookmark.chapterNumber}{isRead ? " (уншсан)" : ""}
          </p>

          {progress !== null && (
            <div>
              <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.07)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: "var(--arc-cyan)" }}
                />
              </div>
              <p className="mt-1 text-[10px]" style={{ color: "var(--arc-muted)" }}>{progress}% дууслаа</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
