// src/app/admin/manhuas/components/FormControls.tsx
"use client";

import React from "react";

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] text-slate-400">{children}</label>;
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { small?: boolean }
) {
  const { small, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={
        "w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 " +
        (small ? "py-1 text-[11px]" : "py-1.5 text-xs") +
        " text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60 " +
        (className || "")
      }
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }
) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={
        "w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/60 " +
        (className || "")
      }
    />
  );
}
