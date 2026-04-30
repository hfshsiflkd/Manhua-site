/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";

type HeroSlide = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string;
  coverImageUrl?: string;
  ratingAverage?: number;
  rating?: number;
  status?: string;
  genres?: string[];
};

type HomePageHeaderProps = {
  slides: HeroSlide[];
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  ongoing: {
    bg: "oklch(0.72 0.17 155/.12)",
    color: "oklch(0.8 0.14 155)",
    border: "1px solid oklch(0.72 0.17 155/.25)",
  },
  completed: {
    bg: "oklch(0.72 0.17 195/.12)",
    color: "var(--arc-cyan)",
    border: "1px solid oklch(0.72 0.17 195/.25)",
  },
  hiatus: {
    bg: "oklch(0.82 0.16 85/.12)",
    color: "var(--arc-amber)",
    border: "1px solid oklch(0.82 0.16 85/.25)",
  },
};

export function HomePageHeader({ slides }: HomePageHeaderProps) {
  const autoplayRef = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayRef.current]);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const mappedSlides = React.useMemo(
    () =>
      (slides || []).map((slide) => ({
        id: slide._id,
        title: slide.title,
        slug: slide.slug,
        rating: (slide.rating ?? slide.ratingAverage ?? 0).toFixed(1),
        genres: Array.isArray(slide.genres) ? slide.genres : [],
        description: slide.description,
        status: slide.status?.toLowerCase() || "ongoing",
        statusLabel: slide.status
          ? slide.status.charAt(0).toUpperCase() + slide.status.slice(1)
          : "Ongoing",
        coverUrl: slide.coverImageUrl || slide.coverImage,
      })),
    [slides]
  );

  if (!mappedSlides.length) return null;

  const goTo = (i: number) => {
    emblaApi?.scrollTo(i);
    autoplayRef.current.reset();
  };

  return (
    <div className="w-full">
      {/* EMBLA */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {mappedSlides.map((slide) => {
            const statusStyle = STATUS_COLORS[slide.status] || STATUS_COLORS.ongoing;
            return (
              <div key={slide.id} className="flex-[0_0_100%] min-w-0">
                <div
                  className="relative w-full overflow-hidden flex"
                  style={{
                    height: "clamp(260px, 36vw, 440px)",
                    background: slide.coverUrl
                      ? `linear-gradient(105deg, rgba(7,7,14,0.98) 0%, rgba(7,7,14,0.78) 50%, rgba(7,7,14,0.18) 100%), url(${slide.coverUrl}) center/cover no-repeat`
                      : "linear-gradient(105deg, #1a0f33, #07070e)",
                  }}
                >
                  {/* Grid lines overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      opacity: 0.04,
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {/* CONTENT */}
                  <div
                    className="relative z-10 flex flex-col justify-center px-6 md:px-12 gap-4"
                    style={{ maxWidth: 620 }}
                  >
                    {/* META ROW */}
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-semibold"
                        style={{
                          background: "rgba(250,204,21,0.12)",
                          border: "1px solid rgba(250,204,21,0.2)",
                          color: "var(--arc-amber)",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                          <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" />
                        </svg>
                        {slide.rating}
                      </div>
                      <div
                        className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={statusStyle}
                      >
                        {slide.statusLabel}
                      </div>
                    </div>

                    {/* TITLE */}
                    <h1
                      className="text-white font-bold leading-tight"
                      style={{
                        fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)",
                        fontSize: "clamp(22px, 3.2vw, 38px)",
                        letterSpacing: "-0.025em",
                      }}
                    >
                      {slide.title}
                    </h1>

                    {/* GENRES */}
                    {slide.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {slide.genres.slice(0, 4).map((g) => (
                          <span
                            key={g}
                            className="rounded-full text-[11px] font-medium px-2.5 py-0.5"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              border: "1px solid var(--arc-border)",
                              color: "var(--arc-dim)",
                            }}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* DESCRIPTION */}
                    <p
                      className="text-[13px] leading-relaxed line-clamp-3 max-w-md"
                      style={{ color: "var(--arc-dim)" }}
                    >
                      {slide.description}
                    </p>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/manhua/${slide.slug}`}
                        className="flex items-center gap-1.5 rounded-[9px] px-5 py-2.5 text-[13px] font-bold transition-all hover:brightness-110 active:scale-95"
                        style={{
                          fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)",
                          background: "var(--arc-cyan)",
                          color: "#07070e",
                          boxShadow: "0 0 22px var(--arc-cyan-glow)",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Унших
                      </Link>
                      <Link
                        href={`/manhua/${slide.slug}`}
                        className="rounded-[9px] px-4 py-2.5 text-[13px] font-medium transition-colors"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--arc-border)",
                          color: "var(--arc-dim)",
                        }}
                      >
                        Дэлгэрэнгүй →
                      </Link>
                    </div>
                  </div>

                  {/* COVER IMAGE (right) */}
                  {slide.coverUrl && (
                    <div
                      className="absolute right-0 top-0 bottom-0 z-10 hidden sm:flex items-center justify-end pr-8 md:pr-12"
                      style={{ width: "clamp(140px, 26%, 280px)" }}
                    >
                      <img
                        src={slide.coverUrl}
                        alt={slide.title}
                        className="rounded-[14px] object-cover"
                        style={{
                          height: "clamp(160px, 26vw, 340px)",
                          width: "auto",
                          maxWidth: "100%",
                          boxShadow: "-20px 0 60px rgba(7,7,14,0.9), 0 8px 32px rgba(0,0,0,0.6)",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DOTS */}
      <div className="flex justify-center items-center gap-1.5 pt-3 pb-1">
        {mappedSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300 border-none cursor-pointer"
            style={{
              height: 4,
              width: i === current ? 32 : 20,
              background: i === current ? "var(--arc-cyan)" : "rgba(255,255,255,0.18)",
              padding: 0,
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
