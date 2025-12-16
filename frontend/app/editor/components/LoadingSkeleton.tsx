export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="animate-pulse space-y-4 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-16 w-12 rounded-lg bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-800" />
            </div>
            <div className="h-8 w-20 rounded bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded bg-slate-800" />
        <div className="h-6 w-1/2 rounded bg-slate-800" />
        <div className="h-3 w-2/3 rounded bg-slate-800" />
      </div>
    </div>
  );
}

