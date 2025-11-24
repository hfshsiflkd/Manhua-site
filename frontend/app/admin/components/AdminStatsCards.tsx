// src/components/admin/AdminStatsCards.tsx
interface AdminStats {
  totalUsers: number;
  totalVIP: number;
  totalManhuas: number;
  totalChapters: number;
  views?: number;
}

export default function AdminStatsCards({ stats }: { stats: AdminStats }) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Users */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-900/70">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Нийт хэрэглэгч
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">
            {stats.totalUsers}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            Бүртгэлтэй бүх хэрэглэгч.
          </p>
        </div>

        {/* VIP */}
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-lg shadow-amber-900/40">
          <p className="text-[11px] uppercase tracking-wide text-amber-200">
            VIP хэрэглэгч
          </p>
          <p className="mt-2 text-3xl font-semibold text-amber-100">
            {stats.totalVIP}
          </p>
          <p className="mt-1 text-[12px] text-amber-200/80">
            Төлбөртэй, VIP эрхтэй хэрэглэгч.
          </p>
        </div>

        {/* Manhuas */}
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 shadow-lg shadow-sky-900/40">
          <p className="text-[11px] uppercase tracking-wide text-sky-200">
            Манхуа
          </p>
          <p className="mt-2 text-3xl font-semibold text-sky-100">
            {stats.totalManhuas}
          </p>
          <p className="mt-1 text-[12px] text-sky-200/80">
            Системд байгаа series–ийн тоо.
          </p>
        </div>

        {/* Chapters */}
        <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 shadow-lg shadow-violet-900/40">
          <p className="text-[11px] uppercase tracking-wide text-violet-200">
            Chapter
          </p>
          <p className="mt-2 text-3xl font-semibold text-violet-100">
            {stats.totalChapters}
          </p>
          <p className="mt-1 text-[12px] text-violet-200/80">
            Нийт нэмэгдсэн бүлгүүд.
          </p>
        </div>
      </section>

      {typeof stats.views === "number" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Нийт уншсан тоо (views)
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">
            {stats.views.toLocaleString("en-US")}
          </p>
        </section>
      )}
    </>
  );
}
