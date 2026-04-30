"use client";

const pulse = { background: "var(--arc-elevated)" };

export function LogRowSkeleton() {
  return (
    <tr style={{ borderTop: "1px solid var(--arc-border)" }}>
      <td className="px-4 py-3"><div className="h-5 w-16 animate-pulse rounded-full" style={pulse} /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded" style={pulse} /></td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="h-4 w-3/4 animate-pulse rounded" style={pulse} />
          <div className="h-4 w-1/2 animate-pulse rounded" style={pulse} />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="h-4 w-24 animate-pulse rounded" style={pulse} />
          <div className="h-3 w-32 animate-pulse rounded" style={pulse} />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded" style={pulse} /></td>
      <td className="px-4 py-3"><div className="h-4 w-4 animate-pulse rounded" style={pulse} /></td>
    </tr>
  );
}

export function LogCardSkeleton() {
  return (
    <div className="rounded-[12px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full" style={pulse} />
          <div className="h-4 w-16 animate-pulse rounded" style={pulse} />
        </div>
        <div className="h-4 w-4 animate-pulse rounded" style={pulse} />
      </div>
      <div className="mb-3 space-y-2">
        <div className="h-4 w-full animate-pulse rounded" style={pulse} />
        <div className="h-4 w-3/4 animate-pulse rounded" style={pulse} />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded" style={pulse} />
        <div className="h-3 w-2/3 animate-pulse rounded" style={pulse} />
      </div>
    </div>
  );
}
