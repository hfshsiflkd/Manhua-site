"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/api";
import LogDetails from "./LogDetails";
import { safeFormatDate } from "../utils/dateFormatter";

interface LogCardProps {
  log: AuditLog;
}

const levelStyle = (level: string) => {
  if (level === "WARN") return { border: "1px solid oklch(0.82 0.16 85/.4)", background: "oklch(0.82 0.16 85/.08)", color: "var(--arc-amber)" };
  if (level === "ERROR") return { border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" };
  return { border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" };
};

export default function LogCard({ log }: LogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const level = log.level || "INFO";
  const timeValue = log.time || log.ts;
  const dateInfo = safeFormatDate(timeValue);

  return (
    <div className="rounded-[12px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={levelStyle(level)}>{level}</span>
          <span className="text-[11px]" style={{ color: "var(--arc-muted)" }} title={dateInfo.exact}>{dateInfo.relative}</span>
          <span className="text-[11px]" style={{ color: "var(--arc-dim)" }}>{log.category}</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="transition-opacity hover:opacity-80" style={{ color: "var(--arc-dim)", background: "none", border: "none", cursor: "pointer" }}>
          <svg className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="mb-2">
        <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Action:</span>
        <span className="ml-2 text-[11px] font-medium" style={{ color: "var(--arc-dim)" }}>{log.action}</span>
      </div>

      <p className="text-[13px] line-clamp-2 mb-3" style={{ color: "var(--arc-text)" }}>{log.message}</p>

      <div className="space-y-1.5 text-[11px]">
        {log.user && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--arc-muted)" }}>User:</span>
            <span style={{ color: "var(--arc-dim)" }}>{log.user.username || "-"}</span>
            <span style={{ color: "var(--arc-muted)" }}>({log.user.role || "-"})</span>
          </div>
        )}
        {log.ip && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--arc-muted)" }}>IP:</span>
            <span className="font-mono text-[10px]" style={{ color: "var(--arc-dim)" }}>{log.ip === "::1" ? "localhost" : log.ip}</span>
          </div>
        )}
        {log.path && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--arc-muted)" }}>Path:</span>
            <span className="text-[10px] truncate" style={{ color: "var(--arc-dim)" }} title={log.path}>{log.method} {log.path.split("?")[0]}</span>
          </div>
        )}
        {log.statusCode && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--arc-muted)" }}>Status:</span>
            <span className="text-[11px] font-medium" style={{ color: log.statusCode >= 500 ? "oklch(0.85 0.12 15)" : log.statusCode >= 400 ? "var(--arc-amber)" : "oklch(0.8 0.14 145)" }}>
              {log.statusCode}
            </span>
            {log.durationMs && <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>({log.durationMs}ms)</span>}
          </div>
        )}
        {dateInfo.isValid && <div className="text-[10px]" style={{ color: "var(--arc-muted)" }}>{dateInfo.exact}</div>}
      </div>

      {expanded && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--arc-border)" }}>
          <LogDetails log={log} />
        </div>
      )}
    </div>
  );
}
