"use client";

interface SmallSpinnerProps {
  className?: string;
}

export default function SmallSpinner({ className = "" }: SmallSpinnerProps) {
  return (
    <div
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400 ${className}`}
      aria-label="Loading"
    />
  );
}

