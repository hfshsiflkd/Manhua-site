/* eslint-disable @next/next/no-img-element */
"use client";
import type { Manhua } from "@/lib/api";

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ongoing:   { background: "oklch(0.72 0.17 195/.1)", color: "var(--arc-cyan)",     border: "1px solid oklch(0.72 0.17 195/.3)" },
  completed: { background: "oklch(0.72 0.17 155/.1)", color: "oklch(0.8 0.14 155)", border: "1px solid oklch(0.72 0.17 155/.3)" },
  hiatus:    { background: "oklch(0.82 0.16 85/.1)",  color: "var(--arc-amber)",    border: "1px solid oklch(0.82 0.16 85/.3)"  },
};

interface ManhuaTopBarProps {
  manhua: Manhua;
  coverPreview: string;
  statusClass: string;
  createdAt: string | null;
  updatedAt: string | null;
  publicUrl: string;
  onBack: () => void;
}

export function ManhuaTopBar({ manhua, coverPreview, createdAt, updatedAt, publicUrl, onBack }: ManhuaTopBarProps) {
  const status = (manhua.status || "ongoing").toLowerCase();
  const ss = STATUS_STYLE[status] || STATUS_STYLE.ongoing;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-3 items-center">
        <div
          className="shrink-0 overflow-hidden"
          style={{ width: 44, height: 58, borderRadius: 8, background: "var(--arc-elevated)", border: "1px solid var(--arc-border)" }}
        >
          <img src={coverPreview} alt={manhua.title} className="h-full w-full object-cover" />
        </div>
        <div>
          <div
            className="font-semibold text-[14px] mb-1"
            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
          >
            {manhua.title}
          </div>
          {manhua.slug && (
            <div className="text-[11px] mb-1.5" style={{ color: "var(--arc-muted)" }}>
              /manhua/<span style={{ color: "var(--arc-dim)" }}>{manhua.slug}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span style={{ ...ss, display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
              {manhua.status || "ongoing"}
            </span>
            {manhua.genres && manhua.genres.length > 0 && (
              <span className="text-[11px]" style={{ color: "var(--arc-dim)" }}>
                {manhua.genres.slice(0, 4).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 md:items-end">
        {(createdAt || updatedAt) && (
          <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "var(--arc-muted)" }}>
            {createdAt && <span>Үүссэн: <span style={{ color: "var(--arc-dim)" }}>{createdAt}</span></span>}
            {updatedAt && <span>Засагдсан: <span style={{ color: "var(--arc-dim)" }}>{updatedAt}</span></span>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-[9px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            ← Буцах
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-[9px] px-3 py-1.5 text-[11px] font-semibold transition-all hover:brightness-110"
            style={{ background: "var(--arc-cyan)", color: "#07070e", textDecoration: "none" }}
          >
            Нийтийн хуудас →
          </a>
        </div>
      </div>
    </div>
  );
}
