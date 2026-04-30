"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function VipPurchase() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  const isVip = user.isVIP && user.vipExpiresAt;
  const vipExpiresAt = user.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const now = new Date();
  const daysRemaining =
    vipExpiresAt && vipExpiresAt > now
      ? Math.ceil((vipExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return (
    <div
      className="rounded-[14px] p-4"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-amber)", boxShadow: "0 0 8px oklch(0.82 0.16 85/.3)" }} />
          <h3 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>VIP</h3>
        </div>
        <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>Онцгой эрх</span>
      </div>

      {isVip && vipExpiresAt && vipExpiresAt > now ? (
        <div className="space-y-3">
          <div
            className="rounded-[10px] px-4 py-3"
            style={{
              background: "oklch(0.82 0.16 85/.08)",
              border: "1px solid oklch(0.82 0.16 85/.3)",
            }}
          >
            <p className="mb-1 text-[12px] font-semibold" style={{ color: "var(--arc-amber)" }}>VIP идэвхтэй ✨</p>
            <p className="text-[11px]" style={{ color: "oklch(0.75 0.12 85)" }}>
              Дуусах: {vipExpiresAt.toLocaleDateString("mn-MN")} ({daysRemaining} өдөр үлдсэн)
            </p>
          </div>
          <button
            onClick={() => router.push("/vip")}
            className="w-full rounded-[9px] px-4 py-2 text-[13px] font-medium transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            Сунгах
          </button>
        </div>
      ) : (
        <button
          onClick={() => router.push("/vip")}
          className="w-full rounded-[9px] px-4 py-2.5 text-[13px] font-semibold transition-all hover:brightness-110"
          style={{
            background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))",
            color: "#07070e",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 16px oklch(0.82 0.16 85/.25)",
          }}
        >
          VIP авах
        </button>
      )}
    </div>
  );
}
