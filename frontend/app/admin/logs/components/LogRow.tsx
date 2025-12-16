"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/api";
import LogDetails from "./LogDetails";
import { safeFormatDate } from "../utils/dateFormatter";

interface LogRowProps {
  log: AuditLog;
}

const levelColors = {
  INFO: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  WARN: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  ERROR: "bg-red-500/20 text-red-300 border-red-500/40",
};

export default function LogRow({ log }: LogRowProps) {
  const [expanded, setExpanded] = useState(false);
  const level = log.level || "INFO";
  const levelColor = levelColors[level] || levelColors.INFO;

  // Use canonical time field with fallback
  const timeValue = log.time || log.ts;
  const dateInfo = safeFormatDate(timeValue);

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className="border-t border-slate-800/80 hover:bg-slate-900/70 transition cursor-pointer"
      >
        {/* Level */}
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelColor}`}
          >
            {level}
          </span>
        </td>

        {/* Time */}
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          <div className="flex flex-col">
            <span>{dateInfo.relative}</span>
            {dateInfo.isValid && (
              <span className="text-[10px] text-slate-600" title={dateInfo.exact}>
                {new Date(timeValue!).toLocaleTimeString("mn-MN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </td>

        {/* Category/Action */}
        <td className="px-4 py-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-300 font-medium">{log.category}</span>
            <span className="text-slate-500 text-[10px]">{log.action}</span>
          </div>
        </td>

        {/* Message */}
        <td className="px-4 py-3 text-xs">
          <div className="line-clamp-2 text-slate-100 max-w-md">
            {log.message}
          </div>
        </td>

        {/* Actor */}
        <td className="px-4 py-3 text-xs">
          {log.user ? (
            <div className="flex flex-col">
              <span className="text-slate-100">{log.user.username || "-"}</span>
              <span className="text-slate-500 text-[10px]">{log.user.role || "-"}</span>
            </div>
          ) : (
            <span className="text-slate-600">-</span>
          )}
        </td>

        {/* IP/Path */}
        <td className="px-4 py-3 text-xs text-slate-400">
          <div className="flex flex-col gap-0.5">
            {log.ip && (
              <span className="font-mono text-[10px]" title={log.ip}>
                {log.ip === "::1" ? "localhost" : log.ip}
              </span>
            )}
            {log.path && (
              <span className="text-[10px] text-slate-600 truncate max-w-[120px]" title={log.path}>
                {log.method} {log.path.split("?")[0]}
              </span>
            )}
          </div>
        </td>

        {/* Expand Indicator */}
        <td className="px-4 py-3 text-center">
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
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
        </td>
      </tr>

      {/* Expanded Details */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 py-4 bg-slate-900/50 border-t border-slate-800">
            <LogDetails log={log} />
          </td>
        </tr>
      )}
    </>
  );
}
