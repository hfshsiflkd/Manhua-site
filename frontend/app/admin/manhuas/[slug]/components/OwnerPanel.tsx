/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/manhuas/components/OwnerPanel.tsx
"use client";

import React from "react";
import type { Manhua } from "@/lib/api";
import { PanelShell } from "./PanelShell";

interface OwnerPanelProps {
  manhua: Manhua;
}

export function OwnerPanel({ manhua }: OwnerPanelProps) {
  return (
    <PanelShell
      title="Owner"
      right={
        manhua.createdBy && (
          <span className="inline-flex rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] text-slate-200">
            {(manhua.createdBy as any).role ?? "user"}
          </span>
        )
      }
    >
      {manhua.createdBy ? (
        <div className="space-y-1">
          <p>
            Username:{" "}
            <span className="font-medium">{manhua.createdBy.username}</span>
          </p>
          {(manhua.createdBy as any).email && (
            <p className="text-slate-400">{(manhua.createdBy as any).email}</p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">Owner мэдээлэл байхгүй.</p>
      )}
    </PanelShell>
  );
}
