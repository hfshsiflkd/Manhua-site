"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/api";
import LogDetails from "./LogDetails";
import { safeFormatDate } from "../utils/dateFormatter";

interface LogCardProps {
  log: AuditLog;
}

const levelColors = {
  INFO: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  WARN: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  ERROR: "bg-red-500/20 text-red-300 border-red-500/40",
};

export default function LogCard({ log }: LogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const level = log.level || "INFO";
  const levelColor = levelColors[level] || levelColors.INFO;

  // Use canonical time field with fallback
  const timeValue = log.time || log.ts;
  const dateInfo = safeFormatDate(timeValue);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelColor}`}
          >
            {level}
          </span>
          <span className="text-xs text-slate-400" title={dateInfo.exact}>
            {dateInfo.relative}
          </span>
          <span className="text-xs text-slate-500">{log.category}</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-slate-300 transition"
        >
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Action */}
      <div className="mb-2">
        <span className="text-xs text-slate-500">Action:</span>
        <span className="ml-2 text-xs text-slate-300 font-medium">{log.action}</span>
      </div>

      {/* Message */}
      <div className="mb-3">
        <p className="text-sm text-slate-100 line-clamp-2">{log.message}</p>
      </div>

      {/* Meta Info */}
      <div className="space-y-2 text-xs">
        {log.user && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">User:</span>
            <span className="text-slate-300">{log.user.username || "-"}</span>
            <span className="text-slate-600">({log.user.role || "-"})</span>
          </div>
        )}
            {log.ip && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">IP:</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {log.ip === "::1" ? "localhost" : log.ip}
                </span>
              </div>
            )}
        {log.path && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Path:</span>
            <span className="text-slate-300 text-[10px] truncate" title={log.path}>
              {log.method} {log.path.split("?")[0]}
            </span>
          </div>
        )}
        {log.statusCode && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Status:</span>
            <span
              className={`text-xs font-medium ${
                log.statusCode >= 500
                  ? "text-red-400"
                  : log.statusCode >= 400
                  ? "text-amber-400"
                  : "text-green-400"
              }`}
            >
              {log.statusCode}
            </span>
            {log.durationMs && (
              <span className="text-slate-600 text-[10px]">({log.durationMs}ms)</span>
            )}
          </div>
        )}
        {dateInfo.isValid && (
          <div className="text-[10px] text-slate-600" title={dateInfo.exact}>
            {dateInfo.exact}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <LogDetails log={log} />
        </div>
      )}
    </div>
  );
}
