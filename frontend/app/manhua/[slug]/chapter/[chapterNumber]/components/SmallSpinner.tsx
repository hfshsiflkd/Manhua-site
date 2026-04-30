"use client";

export default function SmallSpinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${className}`}
      style={{ borderColor: "var(--arc-border)", borderTopColor: "var(--arc-cyan)" }}
      aria-label="Loading"
    />
  );
}
