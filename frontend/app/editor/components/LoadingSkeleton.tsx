export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="animate-pulse space-y-4 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-16 w-12 rounded-[9px]" style={{ background: "var(--arc-elevated)" }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-[6px]" style={{ background: "var(--arc-elevated)" }} />
              <div className="h-3 w-1/2 rounded-[6px]" style={{ background: "var(--arc-elevated)" }} />
            </div>
            <div className="h-8 w-20 rounded-[9px]" style={{ background: "var(--arc-elevated)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded-[6px]" style={{ background: "var(--arc-elevated)" }} />
        <div className="h-6 w-1/2 rounded-[6px]" style={{ background: "var(--arc-elevated)" }} />
        <div className="h-3 w-2/3 rounded-[6px]" style={{ background: "var(--arc-elevated)" }} />
      </div>
    </div>
  );
}
