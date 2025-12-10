// src/app/admin/manhuas/components/PanelShell.tsx
"use client";

import React from "react";

export function PanelShell({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-3.5 text-xs text-slate-300 shadow-md shadow-black/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}
