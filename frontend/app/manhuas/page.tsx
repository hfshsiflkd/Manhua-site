/* eslint-disable @typescript-eslint/no-explicit-any */
// app/manhuas/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Manhua } from "@/types/manhua";

interface ManhuaListResponse {
  items: Manhua[];
  total: number;
  page: number;
  limit: number;
}

const GENRES = [
  { value: "all", label: "Бүгд" },
  { value: "action", label: "Action" },
  { value: "romance", label: "Romance" },
  { value: "fantasy", label: "Fantasy" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
];

export default function ManhuasPage() {
  const [items, setItems] = useState<Manhua[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("all");
  const [status, setStatus] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page, limit };

      if (search.trim()) params.q = search.trim();
      if (genre !== "all") params.genre = genre;
      if (status !== "all") params.status = status;

      const res = await api.get<ManhuaListResponse>("/manhuas", {
        params,
      });

      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Өгөгдөл ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, genre, status, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
              Манхуа жагсаалт
            </h1>
            <p className="text-[11px] text-slate-400 sm:text-xs">
              Бүх манхуа – нэрээр хайх, жанраар шүүх, статус харах.
            </p>
          </div>

          {/* Search + filters */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end"
          >
            {/* Search row */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 md:min-w-[260px]">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Гарчиг, author гэх мэтээр хайх..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 sm:w-auto"
              >
                Хайх
              </button>
            </div>

            {/* Filters row */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-2 md:w-auto">
              <select
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400 sm:w-auto"
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>
                    Жанр: {g.label}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400 sm:w-auto"
              >
                <option value="all">Статус: Бүгд</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="hiatus">Hiatus</option>
              </select>
            </div>
          </form>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Loading / List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
          Жагсаалт ачаалж байна...
        </div>
      ) : (
        <>
          {/* List */}
          <section>
            {items.length === 0 ? (
              <div className="flex min-h-[30vh] items-center justify-center text-sm text-slate-400">
                Тохирох манхуа олдсонгүй.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((m) => (
                  <Link
                    key={m._id}
                    href={`/manhua/${m.slug}`}
                    className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm shadow-slate-900/70 transition hover:-translate-y-1 hover:border-cyan-400/60 hover:shadow-cyan-500/20"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden">
                      <img
                        src={
                          m.coverImage ||
                          "https://via.placeholder.com/300x400"
                        }
                        alt={m.title}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="line-clamp-2 text-[11px] font-semibold text-slate-100 sm:text-xs">
                        {m.title}
                      </p>
                      <p className="text-[10px] text-cyan-400 uppercase">
                        {m.status}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {m.genres?.slice(0, 2).join(", ")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
              <button
                disabled={!hasPrev}
                onClick={() => hasPrev && setPage((p) => p - 1)}
                className="rounded-full border border-slate-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-400"
              >
                ← Өмнөх
              </button>
              <span className="text-[11px] sm:text-xs">
                Хуудас {page} / {totalPages}
              </span>
              <button
                disabled={!hasNext}
                onClick={() => hasNext && setPage((p) => p + 1)}
                className="rounded-full border border-slate-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-400"
              >
                Дараах →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
