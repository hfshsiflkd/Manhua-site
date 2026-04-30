import Link from "next/link";
import type { Manhua } from "@/types/manhua";

interface ManhuaCardProps {
  manhua: Manhua;
  variant?: "default" | "horizontal";
}

const statusStyles: Record<string, { background: string; color: string; border: string }> = {
  ongoing: { background: "oklch(0.72 0.17 155/.12)", color: "oklch(0.8 0.14 155)", border: "1px solid oklch(0.72 0.17 155/.25)" },
  completed: { background: "oklch(0.72 0.17 195/.12)", color: "var(--arc-cyan)", border: "1px solid oklch(0.72 0.17 195/.25)" },
  hiatus: { background: "oklch(0.82 0.16 85/.12)", color: "var(--arc-amber)", border: "1px solid oklch(0.82 0.16 85/.25)" },
};

const statusLabels: Record<string, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

export function ManhuaCard({ manhua, variant = "default" }: ManhuaCardProps) {
  const status = (manhua.status || "ongoing").toLowerCase();
  const statusLabel = statusLabels[status] || status;
  const statusStyle = statusStyles[status] || statusStyles.ongoing;
  const displayTitle = manhua.title || manhua.titleEn || "Untitled";
  const genres = (manhua.genres || []).slice(0, 2);
  const extraGenres = (manhua.genres?.length || 0) - 2;
  const rating = manhua.ratingAverage || 0;

  if (variant === "horizontal") {
    return (
      <Link
        href={`/manhua/${manhua.slug || manhua._id}`}
        prefetch={false}
        className="group flex gap-3 rounded-[10px] p-3 transition-colors active:scale-[0.98]"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--arc-border-h)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
      >
        <div className="relative h-24 w-16 shrink-0 overflow-hidden" style={{ borderRadius: 7, background: "var(--arc-elevated)" }}>
          <img src={manhua.coverImage} alt={displayTitle} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute right-1 top-1 rounded px-1.5 py-0.5 text-[9px] font-bold" style={statusStyle}>
            {statusLabel}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold transition-colors group-hover:text-[var(--arc-cyan)]"
            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            {displayTitle}
          </h3>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.map((g, i) => (
                <span key={i} className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(255,255,255,.06)", color: "var(--arc-dim)" }}>
                  {g}
                </span>
              ))}
              {extraGenres > 0 && <span className="text-[9px]" style={{ color: "var(--arc-muted)" }}>+{extraGenres}</span>}
            </div>
          )}
          <div className="flex items-center justify-between">
            {rating > 0 ? (
              <span className="text-[11px]" style={{ color: "var(--arc-amber)" }}>★ {rating.toFixed(1)}</span>
            ) : <span />}
            {manhua.lastChapterNumber && (
              <span className="text-[11px] font-semibold" style={{ color: "var(--arc-cyan)" }}>Ch. {manhua.lastChapterNumber}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/manhua/${manhua.slug || manhua._id}`}
      prefetch={false}
      className="group block overflow-hidden transition-all hover:-translate-y-1"
      style={{
        borderRadius: "var(--arc-radius-lg)",
        border: "1px solid var(--arc-border)",
        background: "var(--arc-card)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.17 195 / 0.4)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,0,0,.5), 0 0 0 1px oklch(0.72 0.17 195/.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* COVER */}
      <div className="relative w-full overflow-hidden aspect-[3/4]" style={{ background: "var(--arc-elevated)" }}>
        <img
          src={manhua.coverImage}
          alt={displayTitle}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div
          className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={statusStyle}
        >
          {statusLabel}
        </div>
        <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: "linear-gradient(to top,rgba(7,7,14,.85) 0%,transparent 50%)" }} />
      </div>

      {/* BODY */}
      <div className="p-3 space-y-2">
        <h3
          className="line-clamp-2 text-[13px] font-semibold leading-snug transition-colors group-hover:text-[var(--arc-cyan)]"
          style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
        >
          {displayTitle}
        </h3>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.map((g, i) => (
              <span key={i} className="rounded px-1.5 py-0.5 text-[9px]"
                style={{ background: "rgba(255,255,255,.06)", color: "var(--arc-dim)" }}>
                {g}
              </span>
            ))}
            {extraGenres > 0 && <span className="text-[9px]" style={{ color: "var(--arc-muted)" }}>+{extraGenres}</span>}
          </div>
        )}

        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--arc-border)" }}>
          {rating > 0 ? (
            <span className="text-[11px]" style={{ color: "var(--arc-amber)" }}>★ {rating.toFixed(1)}</span>
          ) : <span />}
          {manhua.lastChapterNumber && (
            <span className="text-[11px] font-semibold" style={{ color: "var(--arc-cyan)" }}>Ch. {manhua.lastChapterNumber}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
