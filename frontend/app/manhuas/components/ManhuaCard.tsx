/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Manhua } from "@/types/manhua";

interface ManhuaCardProps {
  manhua: Manhua;
  variant?: "default" | "horizontal";
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ongoing:   { background: "rgba(16,185,129,.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,.3)" },
  completed: { background: "rgba(59,130,246,.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,.3)" },
  hiatus:    { background: "rgba(245,158,11,.15)",  color: "#fcd34d", border: "1px solid rgba(245,158,11,.3)" },
};
const STATUS_LABEL: Record<string, string> = { ongoing: "Ongoing", completed: "Completed", hiatus: "Hiatus" };

const StarIcon = () => (
  <svg width="10" height="10" viewBox="0 0 20 20" fill="oklch(0.82 0.16 85)">
    <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" />
  </svg>
);

export function ManhuaCard({ manhua, variant = "default" }: ManhuaCardProps) {
  const status = (manhua.status || "ongoing").toLowerCase();
  const statusStyle = STATUS_STYLE[status] || STATUS_STYLE.ongoing;
  const statusLabel = STATUS_LABEL[status] || status;
  const title = manhua.title || manhua.titleEn || "Untitled";
  const genres = (manhua.genres || []).slice(0, 2);
  const extra = (manhua.genres?.length || 0) - 2;
  const rating = manhua.ratingAverage || (manhua as any).rating || 0;

  /* ── HORIZONTAL (mobile) ── */
  if (variant === "horizontal") {
    return (
      <Link
        href={`/manhua/${manhua.slug || manhua._id}`}
        prefetch={false}
        className="group flex gap-3 active:scale-[0.98]"
        style={{
          borderRadius: 10, border: "1px solid var(--arc-border)",
          background: "var(--arc-card)", padding: 12,
          textDecoration: "none", transition: "border-color .15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)")}
      >
        <div className="relative shrink-0 overflow-hidden"
          style={{ width: 50, height: 70, borderRadius: 7, background: "var(--arc-elevated)" }}>
          {manhua.coverImage && (
            <img src={manhua.coverImage} alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          )}
          <span style={{ ...statusStyle, position: "absolute", top: 4, right: 4, borderRadius: 4, padding: "1px 5px", fontSize: 8, fontWeight: 700 }}>
            {statusLabel}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <h3 className="line-clamp-2 transition-colors group-hover:text-[var(--arc-cyan)]"
            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontSize: 13, fontWeight: 600, color: "var(--arc-text)", lineHeight: 1.3, marginBottom: 6 }}>
            {title}
          </h3>
          {genres.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {genres.map((g, i) => (
                <span key={i} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,.06)", color: "var(--arc-dim)" }}>{g}</span>
              ))}
              {extra > 0 && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,.06)", color: "var(--arc-dim)" }}>+{extra}</span>}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {rating > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--arc-amber)" }}>
                <StarIcon />{rating.toFixed(1)}
              </span>
            )}
            {manhua.lastChapterNumber && (
              <span style={{ fontSize: 11, color: "var(--arc-cyan)", fontWeight: 600 }}>Ch. {manhua.lastChapterNumber}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  /* ── DEFAULT (grid) ── */
  return (
    <Link href={`/manhua/${manhua.slug || manhua._id}`} prefetch={false} className="manhua-card">
      {/* Cover */}
      <div className="card-cover">
        {manhua.coverImage
          ? <img src={manhua.coverImage} alt={title} className="card-cover-img" />
          : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: "repeating-linear-gradient(-45deg,#0d0d1a,#0d0d1a 5px,#111120 5px,#111120 10px)",
              color: "var(--arc-muted)", fontSize: 9, fontFamily: "monospace", textAlign: "center",
              padding: 8, gap: 4,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25 }}>
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span style={{ opacity: 0.45 }}>{title.slice(0, 14)}</span>
            </div>
          )
        }
        <span className="card-status" style={statusStyle}>{statusLabel}</span>
        <div className="card-overlay" />
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="card-title">{title}</div>

        <div className="card-genres">
          {genres.map((g, i) => <span key={i} className="card-genre">{g}</span>)}
          {extra > 0 && <span className="card-genre">+{extra}</span>}
        </div>

        <div className="card-foot">
          <div className="card-rating">
            <StarIcon />
            {rating > 0 ? rating.toFixed(1) : "—"}
          </div>
          <span className="card-ch">
            Ch. {manhua.lastChapterNumber ?? "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}
