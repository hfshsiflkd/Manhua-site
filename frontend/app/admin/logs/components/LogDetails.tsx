"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/api";

export default function LogDetails({ log }: { log: AuditLog }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, type: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(type); setTimeout(() => setCopied(null), 2000); } catch {}
  };

  const logData = { id: log._id, time: log.time || log.ts, level: log.level, category: log.category, action: log.action, message: log.message, user: log.user, ip: log.ip, method: log.method, path: log.path, statusCode: log.statusCode, durationMs: log.durationMs, requestId: log.requestId, meta: log.meta };
  const jsonString = JSON.stringify(logData, null, 2);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[12px] font-semibold" style={{ color: "var(--arc-dim)" }}>Дэлгэрэнгүй мэдээлэл</h4>
          <button onClick={() => handleCopy(log.message, "message")} className="text-[11px] transition-opacity hover:opacity-80" style={{ color: "var(--arc-cyan)", background: "none", border: "none", cursor: "pointer" }}>
            {copied === "message" ? "✓ Хуулагдлаа" : "Хуулах"}
          </button>
        </div>
        <div className="rounded-[9px] p-3 text-[12px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-dim)" }}>
          {log.message}
        </div>
      </div>

      {(log.requestId || log.path || log.statusCode) && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: "var(--arc-dim)" }}>Request Info</h4>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            {(log.time || log.ts) && (
              <div>
                <span style={{ color: "var(--arc-muted)" }}>Time:</span>
                <div className="mt-1 text-[10px]" style={{ color: "var(--arc-dim)" }}>{new Date(log.time || log.ts!).toLocaleString("mn-MN")}</div>
              </div>
            )}
            {log.requestId && (
              <div>
                <span style={{ color: "var(--arc-muted)" }}>Request ID:</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-[10px] break-all" style={{ color: "var(--arc-dim)" }}>{log.requestId}</span>
                  <button onClick={() => handleCopy(log.requestId!, "requestId")} className="text-[10px] hover:opacity-80" style={{ color: "var(--arc-cyan)", background: "none", border: "none", cursor: "pointer" }}>
                    {copied === "requestId" ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {log.path && (
              <div>
                <span style={{ color: "var(--arc-muted)" }}>Path:</span>
                <div className="mt-1 text-[10px] break-all" style={{ color: "var(--arc-dim)" }}>{log.path}</div>
              </div>
            )}
            {log.statusCode && (
              <div>
                <span style={{ color: "var(--arc-muted)" }}>Status:</span>
                <div className="mt-1 text-[10px]" style={{ color: "var(--arc-dim)" }}>{log.statusCode}</div>
              </div>
            )}
            {log.durationMs && (
              <div>
                <span style={{ color: "var(--arc-muted)" }}>Duration:</span>
                <div className="mt-1 text-[10px]" style={{ color: "var(--arc-dim)" }}>{log.durationMs}ms</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[12px] font-semibold" style={{ color: "var(--arc-dim)" }}>Metadata (JSON)</h4>
          <button onClick={() => handleCopy(jsonString, "json")} className="text-[11px] hover:opacity-80" style={{ color: "var(--arc-cyan)", background: "none", border: "none", cursor: "pointer" }}>
            {copied === "json" ? "✓ Хуулагдлаа" : "JSON хуулах"}
          </button>
        </div>
        <pre className="rounded-[9px] p-3 text-[10px] overflow-x-auto max-h-64 overflow-y-auto" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-muted)" }}>
          {jsonString}
        </pre>
      </div>

      {log.ip && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: "var(--arc-dim)" }}>Quick Actions</h4>
          <div className="flex gap-3">
            <button onClick={() => handleCopy(log.ip!, "ip")} className="text-[11px] hover:opacity-80" style={{ color: "var(--arc-cyan)", background: "none", border: "none", cursor: "pointer" }}>
              {copied === "ip" ? "✓ IP хуулагдлаа" : "Copy IP"}
            </button>
            {log.user?.id && (
              <button onClick={() => { window.location.href = `/admin/logs?userId=${log.user!.id}`; }} className="text-[11px] hover:opacity-80" style={{ color: "var(--arc-cyan)", background: "none", border: "none", cursor: "pointer" }}>
                View User Logs
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
