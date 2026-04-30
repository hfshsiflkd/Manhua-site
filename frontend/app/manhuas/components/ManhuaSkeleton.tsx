export function ManhuaSkeleton() {
  return (
    <div
      className="overflow-hidden"
      style={{ borderRadius: "var(--arc-radius-lg)", border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden" style={{ background: "var(--arc-elevated)" }}>
        <div className="h-full w-full animate-pulse" style={{ background: "var(--arc-elevated)" }} />
        <div className="absolute right-2 top-2 h-4 w-16 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.07)" }} />
      </div>
      <div className="p-3 space-y-2">
        <div className="space-y-1.5">
          <div className="h-4 w-3/4 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
          <div className="h-4 w-1/2 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
        </div>
        <div className="flex gap-1.5">
          <div className="h-4 w-14 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
          <div className="h-4 w-16 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
        </div>
        <div className="flex justify-between pt-2" style={{ borderTop: "1px solid var(--arc-border)" }}>
          <div className="h-3 w-16 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
          <div className="h-3 w-12 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
        </div>
      </div>
    </div>
  );
}

export function ManhuaSkeletonHorizontal() {
  return (
    <div
      className="flex gap-3 p-3"
      style={{ borderRadius: "var(--arc-radius)", border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
    >
      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[7px]" style={{ background: "var(--arc-elevated)" }}>
        <div className="h-full w-full animate-pulse" style={{ background: "var(--arc-elevated)" }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="space-y-1.5">
          <div className="h-4 w-3/4 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
          <div className="h-4 w-1/2 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
        </div>
        <div className="flex gap-1">
          <div className="h-4 w-12 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
          <div className="h-4 w-16 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
        </div>
        <div className="h-3 w-20 animate-pulse rounded" style={{ background: "var(--arc-elevated)" }} />
      </div>
    </div>
  );
}
