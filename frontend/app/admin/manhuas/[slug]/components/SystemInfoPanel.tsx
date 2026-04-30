"use client";

import React from "react";
import type { Manhua } from "@/lib/api";
import { PanelShell } from "./PanelShell";

interface SystemInfoPanelProps {
  manhua: Manhua;
  createdAt: string | null;
  updatedAt: string | null;
}

export function SystemInfoPanel({ manhua, createdAt, updatedAt }: SystemInfoPanelProps) {
  const rows = [
    ["ID", manhua._id],
    manhua.slug ? ["Slug", manhua.slug] : null,
    createdAt ? ["Үүссэн", createdAt] : null,
    updatedAt ? ["Засагдсан", updatedAt] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <PanelShell title="Системийн мэдээлэл">
      <div>
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between text-[11px] gap-2"
            style={{ padding: "7px 0", borderBottom: "1px solid var(--arc-border)" }}
          >
            <span style={{ color: "var(--arc-muted)", flexShrink: 0 }}>{label}</span>
            <span
              className="font-mono truncate text-right"
              style={{ color: "var(--arc-dim)", maxWidth: 200 }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
