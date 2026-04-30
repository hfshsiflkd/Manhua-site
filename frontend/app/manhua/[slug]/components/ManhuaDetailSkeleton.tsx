export function ManhuaDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div
        className="rounded-[14px] p-5"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="flex gap-4">
          <div className="h-40 w-28 rounded-[10px] shrink-0" style={{ background: "var(--arc-elevated)" }} />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded" style={{ background: "var(--arc-elevated)" }} />
            <div className="h-3 w-1/2 rounded" style={{ background: "var(--arc-elevated)" }} />
            <div className="h-3 w-full rounded" style={{ background: "var(--arc-elevated)" }} />
            <div className="h-3 w-3/4 rounded" style={{ background: "var(--arc-elevated)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
