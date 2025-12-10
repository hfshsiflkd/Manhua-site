/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";

type ChapterSummary = {
  _id: string;
  chapterNumber: number;
  title?: string;
};

type PopularItem = {
  _id: string;
  title: string;
  slug: string;
  coverImage?: string;
  coverImageUrl?: string;
  ratingAverage?: number;
  rating?: number;
  status?: string;
  genres?: string[];
  chapters?: ChapterSummary[];
};

type MiddleProps = {
  popular: PopularItem[];
};

const Middle = ({ popular }: MiddleProps) => {
  return (
    <section className="w-full px-4 py-6 text-white">
      {/* CENTER + MAX WIDTH */}
      <div className="mx-auto w-full max-w-5xl">
        {/* HEADER */}
        <div className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold md:text-xl">
          Popular Today
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 [grid-auto-rows:1fr]">
          {popular.map((item, index) => {
            const cover =
              item.coverImageUrl || item.coverImage || "/placeholder.jpg";

            const ratingValue = item.rating ?? item.ratingAverage ?? 0;
            const ratingText = ratingValue.toFixed(1);

            // Сүүлийн / хамгийн өндөр дугаартай chapter-ийг авна
            const latestChapter =
              item.chapters && item.chapters.length > 0
                ? item.chapters.reduce((max, ch) =>
                    ch.chapterNumber > max.chapterNumber ? ch : max
                  )
                : null;

            const chapterNumber = latestChapter?.chapterNumber;
            const chapterText = chapterNumber
              ? `Chapter ${chapterNumber}`
              : "No chapters yet";

            // 🔗 Chapter руу орох линк (route-оо энд тааруулж өөрчилж болно)
            // Жишээ: /manhua/[slug]/chapter/[chapterNumber]
            const chapterHref = latestChapter
              ? `/manhua/${item.slug}/chapter/${latestChapter.chapterNumber}`
              : `/manhua/${item.slug}`;

            return (
              <div
                key={item._id}
                className={`
                  flex h-full flex-col
                  ${index >= 4 ? "hidden md:flex" : "flex"}
                `}
              >
                {/* IMAGE → MANHUA MAIN PAGE */}
                <Link
                  href={`/manhua/${item.slug}`}
                  className="relative w-full overflow-hidden rounded-xl aspect-[193/250]"
                >
                  <img
                    src={cover}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </Link>

                {/* TEXT AREA */}
                <div className="mt-2 flex flex-col gap-1">
                  {/* TITLE → MANHUA MAIN PAGE */}
                  <Link href={`/manhua/${item.slug}`}>
                    <h3
                      className="
      truncate
       md:min-h-[1.8rem]
      text-sm font-semibold
      md:text-base
    "
                    >
                      {item.title}
                    </h3>
                  </Link>

                  {/* CHAPTER – ГОЛЛУУЛСАН + ТУСДАА LINK */}
                  <div className="flex ">
                    <Link
                      href={chapterHref}
                      className={`text-xs md:text-sm ${
                        chapterNumber
                          ? "text-gray-300 hover:text-white transition-colors"
                          : "text-gray-500 cursor-default"
                      }`}
                    >
                      {chapterText}
                    </Link>
                  </div>

                  {/* RATING – TITLE/CHAPTER-ЫН ДОРОО БАЙХААР, ЗАЙ ХЭТ ИХ ҮҮСГЭХГҮЙ */}
                  <div className="mt-1 flex items-center justify-start gap-1 text-xs md:text-sm">
                    <span className="text-yellow-400 leading-none">
                      {"★★★★★".split("").map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </span>
                    <span className="ml-1 text-[0.7rem] text-white md:text-xs leading-none">
                      {ratingText}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Middle;
