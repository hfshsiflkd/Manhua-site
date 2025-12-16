"use client";

export function LogRowSkeleton() {
  return (
    <tr className="border-t border-slate-800/80">
      <td className="px-4 py-3">
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-800" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-800" />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-4 animate-pulse rounded bg-slate-800" />
      </td>
    </tr>
  );
}

export function LogCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-800" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="h-4 w-4 animate-pulse rounded bg-slate-800" />
      </div>
      <div className="mb-3 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}

