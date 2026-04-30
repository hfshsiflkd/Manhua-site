"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!user) return null;

  return (
    <div className="pt-4 pb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <h3 className="text-[12px] font-medium" style={{ color: "var(--arc-muted)" }}>Тохиргоо</h3>
        <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="mb-2 text-[11px] font-medium" style={{ color: "var(--arc-dim)" }}>Аюулгүй байдал</h4>
            <button
              onClick={() => router.push("/login/reset-password")}
              className="w-full rounded-[9px] px-3 py-2 text-[12px] transition-colors"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.05)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--arc-elevated)")}
            >
              Нууц үг солих
            </button>
          </div>

          <div>
            <h4 className="mb-2 text-[11px] font-medium" style={{ color: "var(--arc-dim)" }}>Захиалга</h4>
            {user.isVIP ? (
              <div className="p-3 rounded-[9px]" style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.3)" }}>
                <p className="text-[12px] font-medium" style={{ color: "var(--arc-amber)" }}>VIP идэвхтэй ✨</p>
                {user.vipExpiresAt && (
                  <p className="mt-1 text-[11px]" style={{ color: "oklch(0.72 0.12 85)" }}>
                    Дуусах: {new Date(user.vipExpiresAt).toLocaleDateString("mn-MN")}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push("/vip")}
                className="w-full rounded-[9px] px-3 py-2 text-[12px] font-semibold transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))", color: "#07070e", border: "none", cursor: "pointer" }}
              >
                VIP эрх авах
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
