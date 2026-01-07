// src/components/admin/AdminQuickLinks.tsx
"use client";

import Link from "next/link";

export default function AdminQuickLinks() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Link
        href="/admin/manhuas"
        className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70 hover:border-cyan-400/70 hover:bg-slate-900"
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          CONTENT
        </p>
        <p className="mt-1 text-base font-semibold text-slate-50">
          Манхуа удирдах
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          Нэмэх, засах, статус өөрчлөх.
        </p>
      </Link>

      <Link
        href="/admin/users"
        className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70 hover:border-amber-400/70 hover:bg-slate-900"
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          USERS
        </p>
        <p className="mt-1 text-base font-semibold text-slate-50">
          Хэрэглэгчид & VIP
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          Role тохируулах, VIP хугацаа сунгах.
        </p>
      </Link>

      <Link
        href="/admin/finance"
        className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-slate-900/70 hover:border-emerald-400/70 hover:bg-slate-900"
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          FINANCE
        </p>
        <p className="mt-1 text-base font-semibold text-slate-50">
          Salary distribution
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          30% site / 70% editors (monthly).
        </p>
      </Link>
    </section>
  );
}
