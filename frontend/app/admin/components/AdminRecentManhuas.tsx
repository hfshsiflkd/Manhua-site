"use client";

import Link from "next/link";

interface Manhua {
  _id: string;
  title: string;
  slug?: string;
  coverImageUrl?: string;
  coverImage?: string;
  status?: string;
  genres?: string[];
  createdBy?: { username: string; role?: string };
}

interface Props {
  manhuas: Manhua[];
  loading: boolean;
}

const statusStyle = (status?: string) => {
  if (status === "completed") return { border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.08)", color: "oklch(0.8 0.14 145)" };
  if (status === "ongoing") return { border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" };
  return { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" };
};

export default function AdminRecentManhuas({ manhuas, loading }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: "var(--arc-text)" }}>Сүүлд нэмэгдсэн манхуа</h2>
        <Link href="/admin/manhuas" className="text-[11px] transition-opacity hover:opacity-80" style={{ color: "var(--arc-cyan)" }}>
          Бүгдийг харах →
        </Link>
      </div>

      <div className="rounded-[14px] p-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        {loading ? (
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Манхуа ачаалж байна...</p>
        ) : manhuas.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Одоогоор манхуа бүртгэгдээгүй байна.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {manhuas.map((m) => {
              const cover = m.coverImageUrl || m.coverImage || "https://via.placeholder.com/200x280?text=No+Cover";
              return (
                <div
                  key={m._id}
                  className="group flex flex-col overflow-hidden rounded-[12px] transition"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
                >
                  <div className="relative w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt={m.title} className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3 space-y-1">
                    <p className="line-clamp-2 text-[12px] font-semibold" style={{ color: "var(--arc-text)" }}>{m.title}</p>
                    {m.genres && m.genres.length > 0 && (
                      <p className="line-clamp-1 text-[10px]" style={{ color: "var(--arc-muted)" }}>{m.genres.join(", ")}</p>
                    )}
                    {m.createdBy && (
                      <p className="text-[10px]" style={{ color: "var(--arc-dim)" }}>
                        by <span style={{ color: "var(--arc-text)" }}>{m.createdBy.username}</span>
                        {m.createdBy.role && (
                          <span className="ml-1 rounded-full px-1.5 py-[1px] text-[9px] uppercase" style={{ background: "var(--arc-border)", color: "var(--arc-muted)" }}>
                            {m.createdBy.role}
                          </span>
                        )}
                      </p>
                    )}
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold w-fit" style={statusStyle(m.status)}>
                      {m.status || "draft"}
                    </span>

                    <div className="mt-2 flex items-center justify-between">
                      <Link href={`/admin/manhuas/${m._id}`} className="rounded-full px-3 py-1 text-[10px] font-medium transition-colors" style={{ background: "var(--arc-card)", color: "var(--arc-dim)", border: "1px solid var(--arc-border)" }}>
                        Manage
                      </Link>
                      <Link href={`/manhua/${m.slug ?? m._id}`} className="text-[10px] transition-opacity hover:opacity-80" style={{ color: "var(--arc-cyan)" }}>
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
