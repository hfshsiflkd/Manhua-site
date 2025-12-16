import Link from "next/link";
import type { Manhua } from "@/types/manhua";

interface ManhuaCardProps {
  manhua: Manhua;
  variant?: "default" | "horizontal";
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
            src={manhua.coverImage || "https://via.placeholder.com/300x400"}
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
            ) : manhua.ratingAverage > 0 ? (
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-xs">⭐</span>
                <span className="text-[10px] font-medium text-slate-300">
                  {manhua.ratingAverage.toFixed(1)}
                </span>
              </div>
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
          src={manhua.coverImage || "https://via.placeholder.com/300x400"}
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
          ) : manhua.ratingAverage > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">⭐</span>
              <span className="text-[10px] font-medium text-slate-300 sm:text-xs">
                {manhua.ratingAverage.toFixed(1)}
              </span>
            </div>
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
