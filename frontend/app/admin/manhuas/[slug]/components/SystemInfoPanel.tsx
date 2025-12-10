// src/app/admin/manhuas/components/SystemInfoPanel.tsx
"use client";

import React from "react";
import type { Manhua } from "@/lib/api";
import { PanelShell } from "./PanelShell";

interface SystemInfoPanelProps {
  manhua: Manhua;
  createdAt: string | null;
  updatedAt: string | null;
}

export function SystemInfoPanel({
  manhua,
  createdAt,
  updatedAt,
}: SystemInfoPanelProps) {
  return (
    <PanelShell title="System info">
      <div className="space-y-1 font-mono text-[11px] text-slate-300">
        <p>
          ID: <span className="text-slate-100">{manhua._id}</span>
        </p>
        {manhua.slug && (
          <p>
            Slug: <span className="text-slate-100">{manhua.slug}</span>
          </p>
        )}
        {createdAt && (
          <p>
            Created: <span className="text-slate-200">{createdAt}</span>
          </p>
        )}
        {updatedAt && (
          <p>
            Updated: <span className="text-slate-200">{updatedAt}</span>
          </p>
        )}
      </div>
    </PanelShell>
  );
}
