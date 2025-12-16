"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/api";

interface LogDetailsProps {
  log: AuditLog;
}

export default function LogDetails({ log }: LogDetailsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const logData = {
    id: log._id,
    time: log.time || log.ts,
    level: log.level,
    category: log.category,
    action: log.action,
    message: log.message,
    user: log.user,
    ip: log.ip,
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    durationMs: log.durationMs,
    requestId: log.requestId,
    meta: log.meta,
  };

  const jsonString = JSON.stringify(logData, null, 2);

  return (
    <div className="space-y-4">
      {/* Full Message */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300">Дэлгэрэнгүй мэдээлэл</h4>
          <button
            onClick={() => handleCopy(log.message, "message")}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            {copied === "message" ? "✓ Хуулагдлаа" : "Хуулах"}
          </button>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
          {log.message}
        </div>
      </div>

      {/* Request Info */}
      {(log.requestId || log.path || log.statusCode) && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Request Info</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(log.time || log.ts) && (
              <div>
                <span className="text-slate-500">Time:</span>
                <div className="mt-1 text-slate-300 text-[10px]">
                  {new Date(log.time || log.ts!).toLocaleString("mn-MN")}
                </div>
              </div>
            )}
            {log.requestId && (
              <div>
                <span className="text-slate-500">Request ID:</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-slate-300 text-[10px] break-all">
                    {log.requestId}
                  </span>
                  <button
                    onClick={() => handleCopy(log.requestId!, "requestId")}
                    className="text-cyan-400 hover:text-cyan-300 text-[10px]"
                  >
                    {copied === "requestId" ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {log.path && (
              <div>
                <span className="text-slate-500">Path:</span>
                <div className="mt-1 text-slate-300 text-[10px] break-all">{log.path}</div>
              </div>
            )}
            {log.statusCode && (
              <div>
                <span className="text-slate-500">Status:</span>
                <div className="mt-1 text-slate-300 text-[10px]">{log.statusCode}</div>
              </div>
            )}
            {log.durationMs && (
              <div>
                <span className="text-slate-500">Duration:</span>
                <div className="mt-1 text-slate-300 text-[10px]">{log.durationMs}ms</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata JSON */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300">Metadata (JSON)</h4>
          <button
            onClick={() => handleCopy(jsonString, "json")}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            {copied === "json" ? "✓ Хуулагдлаа" : "JSON хуулах"}
          </button>
        </div>
        <pre className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-[10px] text-slate-400 overflow-x-auto max-h-64 overflow-y-auto">
          {jsonString}
        </pre>
      </div>

      {/* Quick Actions */}
      {log.ip && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Quick Actions</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(log.ip!, "ip")}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              {copied === "ip" ? "✓ IP хуулагдлаа" : "Copy IP"}
            </button>
            {log.user?.id && (
              <button
                onClick={() => {
                  // Filter by userId - would need to be implemented in parent
                  window.location.href = `/admin/logs?userId=${log.user!.id}`;
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition"
              >
                View User Logs
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
