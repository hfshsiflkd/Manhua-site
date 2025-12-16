"use client";

export default function PageSkeleton() {
  // Use a tall aspect ratio that matches typical manga/manhua pages
  // This prevents layout shifts when images load
  // min-height ensures skeleton is visible even on very small screens
  return (
    <div className="relative w-full min-h-[400px] bg-slate-900/40" style={{ aspectRatio: "3/4" }}>
      <div className="absolute inset-0 animate-pulse">
        <div className="h-full w-full bg-gradient-to-b from-slate-800/60 via-slate-800/40 to-slate-800/60" />
      </div>
    </div>
  );
}

