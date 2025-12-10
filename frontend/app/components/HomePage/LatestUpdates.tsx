/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const MAX_TO_SHOW = 20;

type LatestChapter = {
  name: string;
  time: string;
  upcoming: boolean;
  number?: number;
  chapterNumber?: number;
};

type LatestItem = {
  manhuaId: string;
  title: string;
  slug: string;
  coverImageUrl: string;
  chapters: LatestChapter[];
  cover: string;
};

type LatestUpdatesProps = {
  updates: LatestItem[];
};

const LatestUpdates = ({ updates }: LatestUpdatesProps) => {
  const router = useRouter();
  const items = updates.slice(0, MAX_TO_SHOW);

  return (
    <section className="w-full text-white">
      <div className="mx-auto w-full max-w-6xl rounded-xl bg-slate-900/60 px-3 py-4 md:px-6 md:py-5">
        {/* HEADER BAR */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Latest Updates</h2>
          </div>
        </div>

        {/* LIST – 1 col on mobile, 2 cols on laptop */}
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.manhuaId}
              className="flex cursor-pointer gap-4 rounded-xl bg-black/30 px-4 py-4 hover:bg-black/50 transition"
              onClick={() => router.push(`/manhua/${item.slug}`)} // Карт дээр дарахад манхуа руу
            >
              {/* COVER IMAGE */}
              <div className="h-[120px] w-[90px] shrink-0 overflow-hidden rounded-lg">
                <img
                  src={item.cover }
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* RIGHT SIDE */}
              <div className="flex flex-1 flex-col">
                {/* TITLE – нэг мөр, ... */}
                <h3 className="mb-2 truncate text-base font-semibold">
                  {item.title}
                </h3>

                {/* CHAPTERS */}
                <div className="space-y-1 text-xl">
                  {item.chapters.map((ch, i) => {
                    const chapterNumber = ch.number ?? ch.chapterNumber;
                    // chapter дээр дарахад шууд chapter page рүү
                    const chapterHref =
                      chapterNumber != null
                        ? `/manhua/${item.slug}/chapter/${chapterNumber}`
                        : `/manhua/${item.slug}`;

                    return (
                      <Link
                        key={i}
                        href={chapterHref}
                        onClick={(e) => e.stopPropagation()} // гадна click event-ийг зогсооно
                        className="flex items-center justify-between gap-2 text-[15px] text-gray-300 hover:text-white"
                      >
                        {/* LEFT: bullet + chapter name */}
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <p className="min-w-0 truncate">{ch.name}</p>
                        </div>

                        {/* RIGHT: time / upcoming */}
                        <div className="flex flex-shrink-0 items-center gap-1 text-[12px] text-gray-400">
                          {ch.upcoming && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-700/40 text-[10px] text-fuchsia-300">
                              ⏱
                            </span>
                          )}
                          <span>{ch.time}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PAGINATION – одоо хоосон логик, хүсвэл дараа нь backend-тэй холбож болно */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button className="flex min-w-[140px] items-center justify-center gap-1 rounded-md bg-[#2E2E36] px-4 py-2 text-sm text-gray-200">
            <span className="text-xs">◀</span>
            <span>Previous</span>
          </button>
          <button className="flex min-w-[140px] items-center justify-center gap-1 rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-semibold">
            <span>Next</span>
            <span className="text-xs">▶</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
