/* eslint-disable @typescript-eslint/no-explicit-any */
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
      title="Эзэн"
      right={
        manhua.createdBy && (
          <span
            className="rounded-[4px] px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}
          >
            {(manhua.createdBy as any).role ?? "user"}
          </span>
        )
      }
    >
      {manhua.createdBy ? (
        <div>
          <div className="flex items-center justify-between text-[11px]" style={{ padding: "7px 0", borderBottom: "1px solid var(--arc-border)" }}>
            <span style={{ color: "var(--arc-muted)" }}>Username</span>
            <span style={{ color: "var(--arc-dim)" }}>{manhua.createdBy.username}</span>
          </div>
          {(manhua.createdBy as any).email && (
            <div className="flex items-center justify-between text-[11px]" style={{ padding: "7px 0", borderBottom: "1px solid var(--arc-border)" }}>
              <span style={{ color: "var(--arc-muted)" }}>Email</span>
              <span style={{ color: "var(--arc-dim)" }}>{(manhua.createdBy as any).email}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Owner мэдээлэл байхгүй.</p>
      )}
    </PanelShell>
  );
}
