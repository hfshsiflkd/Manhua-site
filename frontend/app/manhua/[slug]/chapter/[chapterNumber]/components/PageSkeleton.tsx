"use client";

export default function PageSkeleton() {
  return (
    <div className="relative w-full min-h-[400px] animate-pulse" style={{ aspectRatio: "3/4", background: "var(--arc-card)" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,var(--arc-elevated) 0%,var(--arc-card) 50%,var(--arc-elevated) 100%)" }} />
    </div>
  );
}
