"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/api";
import LogDetails from "./LogDetails";
import { safeFormatDate } from "../utils/dateFormatter";

const levelStyle = (level: string) => {
  if (level === "WARN") return { border: "1px solid oklch(0.82 0.16 85/.4)", background: "oklch(0.82 0.16 85/.08)", color: "var(--arc-amber)" };
  if (level === "ERROR") return { border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" };
  return { border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" };
};

export default function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const level = log.level || "INFO";
  const timeValue = log.time || log.ts;
  const dateInfo = safeFormatDate(timeValue);

  return (
    <>
      <tr onClick={() => setExpanded(!expanded)} className="transition cursor-pointer" style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <td className="px-4 py-3">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={levelStyle(level)}>{level}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{dateInfo.relative}</span>
            {dateInfo.isValid && (
              <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>
                {new Date(timeValue!).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--arc-dim)" }}>{log.category}</span>
            <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>{log.action}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="line-clamp-2 text-[12px] max-w-md" style={{ color: "var(--arc-text)" }}>{log.message}</div>
        </td>
        <td className="px-4 py-3">
          {log.user ? (
            <div className="flex flex-col">
              <span className="text-[11px]" style={{ color: "var(--arc-dim)" }}>{log.user.username || "-"}</span>
              <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>{log.user.role || "-"}</span>
            </div>
          ) : <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>-</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            {log.ip && <span className="font-mono text-[10px]" style={{ color: "var(--arc-muted)" }}>{log.ip === "::1" ? "localhost" : log.ip}</span>}
            {log.path && <span className="text-[10px] truncate max-w-[120px]" style={{ color: "var(--arc-muted)" }} title={log.path}>{log.method} {log.path.split("?")[0]}</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <svg className={`h-4 w-4 transition-transform mx-auto ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--arc-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 py-4" style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
            <LogDetails log={log} />
          </td>
        </tr>
      )}
    </>
  );
}
