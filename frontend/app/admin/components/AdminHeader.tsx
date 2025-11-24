// src/components/admin/AdminHeader.tsx
"use client";

interface Props {
  statsLoaded: boolean;
}

export default function AdminHeader({ statsLoaded }: Props) {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent">
          Overview
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Системийн үндсэн үзүүлэлтүүд, хэрэглэгчид ба контентын статистик.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium ${
            statsLoaded
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-slate-600 bg-slate-800 text-slate-300"
          }`}
        >
          ● {statsLoaded ? "Online" : "Loading"}
        </span>
        <span className="hidden md:inline text-slate-500">
          /api/admin/stats
        </span>
      </div>
    </header>
  );
}
