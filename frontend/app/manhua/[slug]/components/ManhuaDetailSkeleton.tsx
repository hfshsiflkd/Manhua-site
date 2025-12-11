// src/components/manhua/ManhuaDetailSkeleton.tsx

export function ManhuaDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="h-40 w-28 animate-pulse rounded-xl bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-700" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
