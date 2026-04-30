"use client";

import Link from "next/link";

interface Manhua {
  _id: string;
  title: string;
  slug?: string;
  coverImageUrl?: string;
  coverImage?: string;
  status?: string;
  chapterCount?: number;
  chaptersCount?: number;
  views?: number;
  updatedAt?: string;
}

interface Props {
  manhuas: Manhua[];
  loading: boolean;
}

const STATUS_CLASS: Record<string, React.CSSProperties> = {
  ongoing:   { background: "rgba(16,185,129,.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,.2)" },
  completed: { background: "rgba(59,130,246,.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,.2)" },
  hiatus:    { background: "rgba(245,158,11,.12)",  color: "#fcd34d", border: "1px solid rgba(245,158,11,.2)" },
};
const STATUS_LABEL: Record<string, string> = { ongoing: "Ongoing", completed: "Completed", hiatus: "Hiatus" };

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Саяхан";
  if (h < 24) return `${h}ц өмнө`;
  return `${Math.floor(h / 24)} өдөр өмнө`;
}

export default function AdminRecentManhuas({ manhuas, loading }: Props) {
  return (
    <div style={{ background: "var(--arc-card)", border: "1px solid var(--arc-border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--arc-border)", background: "rgba(0,0,0,.2)" }}>
        <span style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontSize: 13, fontWeight: 700, color: "var(--arc-text)" }}>Сүүлийн манхуа</span>
        <Link href="/admin/manhuas" style={{ fontSize: 11, color: "var(--arc-cyan)", textDecoration: "none" }}>Бүгдийг харах →</Link>
      </div>

      {loading ? (
        <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--arc-muted)" }}>Ачаалж байна...</div>
      ) : manhuas.length === 0 ? (
        <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--arc-muted)" }}>Манхуа бүртгэгдээгүй байна.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Манхуа", "Статус", "Ch.", "Үзэлт", ""].map((h) => (
                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--arc-muted)", background: "rgba(0,0,0,.15)", borderBottom: "1px solid var(--arc-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manhuas.map((m) => {
              const status = (m.status || "ongoing").toLowerCase();
              const pill = STATUS_CLASS[status] || STATUS_CLASS.ongoing;
              const chapters = (m as any).chapterCount ?? (m as any).chaptersCount ?? "—";
              return (
                <tr key={m._id} style={{ borderBottom: "1px solid var(--arc-border)" }}
                  onMouseEnter={(e) => { Array.from(e.currentTarget.querySelectorAll("td")).forEach(td => (td as HTMLElement).style.background = "rgba(255,255,255,.02)"); }}
                  onMouseLeave={(e) => { Array.from(e.currentTarget.querySelectorAll("td")).forEach(td => (td as HTMLElement).style.background = ""); }}
                >
                  <td style={{ padding: "11px 16px", fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: "var(--arc-muted)", marginTop: 2 }}>{timeAgo(m.updatedAt)}</div>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 12 }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, ...pill }}>
                      {STATUS_LABEL[status] || status}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 12 }}>
                    <span style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontWeight: 600, color: "var(--arc-text)" }}>{chapters}</span>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 12 }}>
                    <span style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontWeight: 600, color: "var(--arc-text)" }}>{m.views?.toLocaleString() ?? "—"}</span>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Link href={`/admin/manhuas/${m._id}`}
                        style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", fontSize: 10, cursor: "pointer", textDecoration: "none", transition: "color .12s, border-color .12s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.12)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; }}
                      >
                        Засах
                      </Link>
                      <Link href={`/admin/manhuas/${m._id}/chapters/new`}
                        style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", fontSize: 10, cursor: "pointer", textDecoration: "none" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.12)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; }}
                      >
                        Ch+
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
