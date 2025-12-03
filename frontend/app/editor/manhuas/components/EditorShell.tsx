// app/editor/components/EditorShell.tsx
"use client";

import React from "react";

interface EditorShellProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function EditorShell({
  title,
  subtitle,
  children,
}: EditorShellProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-950/95">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        {title && (
          <header className="flex flex-col gap-1 border-b border-slate-800 pb-3">
            <h1 className="text-base font-semibold text-slate-50 md:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-slate-400 md:text-xs">
                {subtitle}
              </p>
            )}
          </header>
        )}

        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
