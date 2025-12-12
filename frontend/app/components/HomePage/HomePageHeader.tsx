/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

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
  // хэрэгтэй бол бусад field-үүдээ ч нэмэж болно
};

type HomePageHeaderProps = {
  slides: HeroSlide[];
};

export function HomePageHeader({ slides }: HomePageHeaderProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 2500, stopOnInteraction: true })
  );

  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // backend-ээс ирсэн raw data-г UI-д хэрэгтэй бүтэц рүү хөрвүүлнэ
  const mappedSlides = React.useMemo(
    () =>
      (slides || []).map((slide) => {
        const coverUrl = slide.coverImageUrl || slide.coverImage;
        const ratingValue =
          slide.rating ??
          slide.ratingAverage ??
          0;

        const genresText = Array.isArray(slide.genres)
          ? slide.genres.join(", ")
          : "";

        const statusText = slide.status
          ? slide.status.charAt(0).toUpperCase() + slide.status.slice(1)
          : "Unknown";

        return {
          id: slide._id,
          title: slide.title,
          rating: ratingValue.toFixed(1),
          genres: genresText,
          description: slide.description,
          status: statusText,
          coverUrl,
        };
      }),
    [slides]
  );

  if (!mappedSlides.length) {
    return null; // эсвэл loading skeleton тавьж болно
  }

  return (
    <Carousel
      plugins={[plugin.current]}
      setApi={setApi}
      opts={{ loop: true }}
      className="w-full z-0"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent className="ml-0">
        {mappedSlides.map((slide, index) => (
          <CarouselItem key={slide.id ?? index} className="basis-full pl-0">
            <Card className="border-0 bg-transparent shadow-none p-0">
              <CardContent className="p-0">
                <div
                  className="
                    relative flex w-full overflow-hidden rounded-xl text-white shadow-xl
                    h-[260px] md:h-[320px] lg:h-[380px] xl:h-[420px]
                  "
                  style={{
                    backgroundImage: `
                      linear-gradient(
                        to right,
                        rgba(26, 15, 51, 0.95),
                        rgba(18, 9, 32, 0.85),
                        rgba(0,0,0,0.75)
                      ),
                      url(${slide.coverUrl})
                    `,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {/* LEFT TEXT SIDE */}
                  <div className="flex flex-1 flex-col justify-between p-6 md:p-8">
                    <div className="space-y-3 lg:space-y-4">
                      <div className="flex items-center gap-3 lg:gap-4">
                        {/* ⭐ STAR RATING */}
                        <div className="relative h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 flex-shrink-0">
                          <svg
                            viewBox="0 0 100 100"
                            className="h-full w-full drop-shadow-md"
                          >
                            <polygon
                              points="50,5 61,39 97,39 67,59 79,91 50,70 21,91 33,59 3,39 39,39"
                              fill="#FACC15"
                            />
                          </svg>

                          {/* текстийг яг голд нь */}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-black md:text-sm lg:text-base">
                              {slide.rating}
                            </span>
                          </div>
                        </div>

                        {/* TITLE */}
                        <div className="flex flex-col gap-0.5">
                          <h2 className="max-w-[24rem] text-lg font-semibold leading-snug tracking-wide md:max-w-[30rem] md:text-2xl lg:text-3xl">
                            {slide.title}
                          </h2>
                        </div>
                      </div>

                      {/* GENRES */}
                      {slide.genres && (
                        <p className="max-w-xl text-xs text-gray-300 md:text-sm lg:text-base">
                          {slide.genres}
                        </p>
                      )}
                    </div>

                    {/* SUMMARY + STATUS */}
                    <div className="space-y-2 text-xs md:text-sm lg:text-base">
                      <p className="font-semibold uppercase tracking-[0.15em]">
                        description
                      </p>
                      <p className="max-w-xl overflow-hidden text-ellipsis text-gray-100 line-clamp-3">
                        {slide.description}
                      </p>
                      <p className="pt-2 font-semibold">
                        Status:{" "}
                        <span className="font-normal text-gray-100">
                          {slide.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* RIGHT COVER IMAGE */}
                  <div className="flex h-full items-center justify-center pr-4 sm:pr-6">
                    <div className="h-[200px] sm:h-[230px] md:h-[260px] lg:h-[320px] xl:h-[360px] overflow-hidden rounded-md shadow-2xl">
                      <img
                        src={slide.coverUrl}
                        alt={slide.title}
                        className="h-full w-auto object-cover"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* DOTS */}
      <div className="mt-4 flex w-full items-center justify-center gap-2 pb-2">
        {mappedSlides.map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition ${
              i === current ? "bg-yellow-400" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </Carousel>
  );
}
