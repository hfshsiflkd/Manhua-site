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
    <section
      className="rounded-[14px] text-[12px]"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", padding: "16px 18px" }}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3
          className="text-[13px] font-semibold"
          style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
        >
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}
