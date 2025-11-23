/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Manhua {
  _id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  status: string;
  genres?: string[];
  views?: number;
}

interface ManhuaListResponse {
  items: Manhua[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminManhuasPage() {
  const router = useRouter();
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [filtered, setFiltered] = useState<Manhua[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get<ManhuaListResponse>("/manhuas", {
          params: { page: 1, limit: 200 },
        });

        const list = res.data.items || [];
        setManhuas(list);
        setFiltered(list);
      } catch (err: any) {
        console.error(err);
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          router.push("/admin/login");
        } else {
          alert("Манхуа ачаалахад алдаа гарлаа.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // filter / search
  useEffect(() => {
    const s = search.toLowerCase();
    const result = manhuas.filter((m) => {
      if (s) {
        const text = (m.title + " " + (m.genres || []).join(" ")).toLowerCase();
        if (!text.includes(s)) return false;
      }
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      return true;
    });
    setFiltered(result);
  }, [search, statusFilter, manhuas]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Манхуа ачаалж байна...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent">
            Манхуа удирдах
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Манхуа нэмэх, засах, статусаар нь удирдах хэсэг.
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/manhuas/new")}
          className="self-start rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-cyan-500/40 hover:bg-cyan-400"
        >
          + Шинэ манхуа нэмэх
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нэр, жанраар хайх…"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "published" | "draft")
            }
            className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
          >
            <option value="all">Статус: бүгд</option>
            <option value="published">Зөвхөн published</option>
            <option value="draft">Зөвхөн draft</option>
          </select>

          <span className="text-[11px] text-slate-500">
            Нийт: {filtered.length}
          </span>
        </div>
      </div>

      {/* List / grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center text-sm text-slate-400">
          Тохирох манхуа олдсонгүй.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => (
            <div
              key={m._id}
              className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs shadow-lg shadow-slate-950/70 transition hover:-translate-y-1 hover:border-cyan-400/60 hover:bg-slate-900"
            >
              {/* Cover */}
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={
                    m.coverImageUrl ||
                    "https://via.placeholder.com/300x400?text=No+Cover"
                  }
                  alt={m.title}
                  className="h-48 w-full object-cover transition group-hover:scale-105"
                />
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    m.status === "published"
                      ? "bg-emerald-500/30 text-emerald-50 border border-emerald-400/60"
                      : "bg-slate-800/80 text-slate-100 border border-slate-600/60"
                  }`}
                >
                  {m.status}
                </span>
              </div>

              {/* Info */}
              <div className="mt-3 flex-1 space-y-1">
                <p className="line-clamp-2 text-[13px] font-semibold text-slate-50">
                  {m.title}
                </p>
                <p className="line-clamp-1 text-[11px] text-cyan-300">
                  {m.genres?.join(", ") || "Жанр тохируулаагүй"}
                </p>
                {typeof m.views === "number" && (
                  <p className="text-[10px] text-slate-500">
                    {m.views.toLocaleString("en-US")} удаа уншсан
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <Link
                  href={`/admin/manhuas/${m.slug}`}
                  className="flex-1 rounded-full bg-slate-800 px-3 py-1.5 text-center text-[11px] font-medium text-slate-100 hover:bg-slate-700"
                >
                  Manage
                </Link>
                <Link
                  href={`/manhua/${m.slug}`}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] text-cyan-300 hover:bg-slate-800 hover:text-cyan-200"
                >
                  View
                </Link>
              </div>

              {/* Edit/Delete tiny row */}
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/manhuas/edit/${m.slug}`)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  ✏️ Засах
                </button>
                <button
                  type="button"
                  onClick={() =>
                    alert("Delete үйлдлийг дараа бүрэн хэрэгжүүлье 😉")
                  }
                  className="text-[11px] text-red-400 hover:text-red-300"
                >
                  🗑 Устгах
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
