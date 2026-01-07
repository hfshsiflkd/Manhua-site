import Link from "next/link";
import type { Manhua } from "@/types/manhua";
import RatingStars from "./RatingStars";

interface ManhuaCardProps {
  manhua: Manhua;
  variant?: "default" | "horizontal" | "mobile";
}

const statusLabels: Record<string, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

const statusColors: Record<string, string> = {
  ongoing: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  completed: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  hiatus: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

export function ManhuaCard({ manhua, variant = "default" }: ManhuaCardProps) {
  const status = (manhua.status || "ongoing").toLowerCase();
  const statusLabel = statusLabels[status] || status;
  const statusColor = statusColors[status] || statusColors.ongoing;

  const genres = manhua.genres || [];
  const displayGenres = genres.slice(0, 2);
  const remainingCount = genres.length - 2;

  // Format last update date if available
  const lastUpdate = (() => {
    const dateValue = manhua.lastChapterAt || manhua.updatedAt;
    if (!dateValue) return null;
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString("mn-MN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  })();

  const cover =
    (manhua as any).coverImageUrl ||
    manhua.coverImage ||
    "https://via.placeholder.com/300x400";

  const rating = Number((manhua as any).ratingAverage || (manhua as any).rating || 0);
  const hasRating = Number.isFinite(rating) && rating > 0;

  const views = Number((manhua as any).views || 0);
  const viewsLabel =
    views >= 1_000_000
      ? `${(views / 1_000_000).toFixed(1)}M`
      : views >= 1_000
      ? `${(views / 1_000).toFixed(1)}K`
      : `${views}`;

  // Mobile grid variant (modern cover card)
  if (variant === "mobile") {
    return (
      <Link
        href={`/manhua/${manhua.slug || manhua._id}`}
        className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/40 transition active:scale-[0.98]"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={manhua.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent" />

          {/* status */}
          <div
            className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}
          >
            {statusLabel}
          </div>

          {/* views */}
          <div className="absolute right-2 top-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
            👁 {viewsLabel}
          </div>

          {/* bottom info */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="line-clamp-2 text-sm font-semibold text-slate-50 drop-shadow">
              {manhua.title}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              {hasRating ? (
                <RatingStars value={rating} size={14} showValue={false} />
              ) : (
                <span className="text-[11px] text-slate-400">Үнэлгээ байхгүй</span>
              )}

              {manhua.lastChapterNumber ? (
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                  Ch. {manhua.lastChapterNumber}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                {lastUpdate || "—"}
              </span>
              {hasRating ? (
                <span className="text-[11px] font-semibold text-amber-200">
                  {rating.toFixed(1)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Horizontal variant for mobile
  if (variant === "horizontal") {
    return (
      <Link
        href={`/manhua/${manhua.slug || manhua._id}`}
        className="group flex gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg shadow-black/40 transition-all active:scale-[0.98]"
      >
        {/* Cover Image - Smaller for horizontal */}
        <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-950">
          <img
            src={cover}
            alt={manhua.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Status Badge */}
          <div
            className={`absolute right-1 top-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${statusColor}`}
          >
            {statusLabel}
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-100">
            {manhua.title}
          </h3>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {displayGenres.map((genre, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300"
                >
                  {genre}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="text-[9px] text-slate-500">+{remainingCount}</span>
              )}
            </div>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between gap-2">
            {lastUpdate ? (
              <span className="text-[10px] text-slate-400">{lastUpdate}</span>
            ) : hasRating ? (
              <RatingStars value={rating} size={12} />
            ) : (
              <span className="text-[10px] text-slate-600">-</span>
            )}
            {manhua.lastChapterNumber && (
              <span className="text-[10px] font-medium text-cyan-400">
                Ch. {manhua.lastChapterNumber}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default vertical card
  return (
    <Link
      href={`/manhua/${manhua.slug || manhua._id}`}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/40 transition-all hover:-translate-y-1 hover:border-cyan-500/60 hover:shadow-cyan-500/20"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
        <img
          src={cover}
          alt={manhua.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Status Badge - Top Right */}
        <div
          className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}
        >
          {statusLabel}
        </div>
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Card Content */}
      <div className="space-y-2 p-3 sm:p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-100 sm:text-base">
          {manhua.title}
        </h3>

        {/* Genres */}
        {genres.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayGenres.map((genre, idx) => (
              <span
                key={idx}
                className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 sm:text-xs"
              >
                {genre}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-[10px] text-slate-500 sm:text-xs">
                +{remainingCount}
              </span>
            )}
          </div>
        ) : (
          <div className="h-4" /> // Spacer when no genres
        )}

        {/* Footer Info */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-2">
          {lastUpdate ? (
            <span className="text-[10px] text-slate-400 sm:text-xs">
              {lastUpdate}
            </span>
          ) : hasRating ? (
            <RatingStars value={rating} size={12} />
          ) : (
            <span className="text-[10px] text-slate-600 sm:text-xs">-</span>
          )}
          {manhua.lastChapterNumber && (
            <span className="text-[10px] text-cyan-400 sm:text-xs">
              Ch. {manhua.lastChapterNumber}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
