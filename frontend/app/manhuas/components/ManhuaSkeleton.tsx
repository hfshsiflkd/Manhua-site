export function ManhuaSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/40 sm:rounded-2xl">
      {/* Cover Image Skeleton */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
        <div className="h-full w-full animate-pulse bg-slate-800" />
        {/* Status Badge Skeleton */}
        <div className="absolute right-2 top-2 h-5 w-16 animate-pulse rounded-full bg-slate-800" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-2 p-3 sm:p-4">
        {/* Title Skeleton */}
        <div className="space-y-1.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
        </div>

        {/* Genres Skeleton */}
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-800" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-800" />
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-2">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-12 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

// Horizontal skeleton for mobile
export function ManhuaSkeletonHorizontal() {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg shadow-black/40">
      {/* Cover Image Skeleton */}
      <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-950">
        <div className="h-full w-full animate-pulse bg-slate-800" />
      </div>

      {/* Content Skeleton */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="space-y-1.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="flex gap-1">
          <div className="h-4 w-12 animate-pulse rounded-full bg-slate-800" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-slate-800" />
        </div>
        <div className="h-3 w-20 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}
