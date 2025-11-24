// src/components/admin/AdminRecentManhuas.tsx
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
  createdBy?: {
    username: string;
    role?: string;
  };
}

interface Props {
  manhuas: Manhua[];
  loading: boolean;
}

export default function AdminRecentManhuas({ manhuas, loading }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100 sm:text-base">
          Сүүлд нэмэгдсэн манхуа
        </h2>
        <Link
          href="/admin/manhuas"
          className="text-[11px] text-cyan-400 hover:text-cyan-300"
        >
          Бүгдийг харах →
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-lg shadow-slate-950/60">
        {loading ? (
          <p className="text-xs text-slate-400">Манхуа ачаалж байна...</p>
        ) : manhuas.length === 0 ? (
          <p className="text-xs text-slate-400">
            Одоогоор манхуа бүртгэгдээгүй байна.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {manhuas.map((m) => {
              const cover =
                m.coverImageUrl ||
                m.coverImage ||
                "https://via.placeholder.com/200x280?text=No+Cover";

              return (
                <div
                  key={m._id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950/90 shadow-sm shadow-black/60 transition hover:-translate-y-[2px] hover:border-cyan-400/70 hover:shadow-cyan-500/20"
                >
                  {/* Cover */}
                  <div className="relative w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={m.title}
                      className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,_#22d3ee33,_transparent_60%)]" />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <div className="space-y-1">
                      <p className="line-clamp-2 text-[12px] font-semibold text-slate-50">
                        {m.title}
                      </p>

                      {m.genres && m.genres.length > 0 && (
                        <p className="line-clamp-1 text-[10px] text-slate-400">
                          {m.genres.join(", ")}
                        </p>
                      )}

                      {m.createdBy && (
                        <p className="text-[10px] text-slate-500">
                          by{" "}
                          <span className="text-slate-300">
                            {m.createdBy.username}
                          </span>{" "}
                          {m.createdBy.role && (
                            <span className="rounded-full bg-slate-800/80 px-1.5 py-[1px] text-[9px] uppercase text-slate-400">
                              {m.createdBy.role}
                            </span>
                          )}
                        </p>
                      )}

                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          m.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                            : m.status === "ongoing"
                            ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/40"
                            : "bg-slate-700/80 text-slate-200 border border-slate-600/70"
                        }`}
                      >
                        {m.status || "draft"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        href={`/admin/manhuas/${m._id}`}
                        className="rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-medium text-slate-100 shadow shadow-black/40 transition hover:bg-slate-800/90 hover:text-cyan-200"
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/manhua/${m.slug ?? m._id}`}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300"
                      >
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
