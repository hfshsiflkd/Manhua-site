/* eslint-disable react-hooks/purity */
"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export default function VipTrialReminder() {
  const { user } = useAuth();
  const isVIP = user?.isVIP;
  const vipExpiresAt = user?.vipExpiresAt;

  const info = useMemo(() => {
    if (!isVIP || !vipExpiresAt) return null;
    const exp = new Date(vipExpiresAt).getTime();
    if (Number.isNaN(exp)) return null;
    const diffMs = exp - Date.now();
    if (diffMs <= 0) return null;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 24) return null;
    return { hoursLeft: Math.ceil(diffHours), expText: new Date(vipExpiresAt).toLocaleString() };
  }, [isVIP, vipExpiresAt]);

  if (!info) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-0">
      <div
        className="mt-3 mb-3 rounded-[12px] p-3 sm:p-4"
        style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.35)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--arc-amber)" }}>
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] shrink-0"
                style={{ background: "oklch(0.82 0.16 85/.15)", border: "1px solid oklch(0.82 0.16 85/.3)" }}
              >
                ⏳
              </span>
              <span className="truncate">VIP эрх дуусах гэж байна</span>
            </p>
            <p className="mt-1 text-[12px] leading-snug" style={{ color: "oklch(0.72 0.12 85)" }}>
              <span className="font-semibold" style={{ color: "var(--arc-amber)" }}>{info.hoursLeft} цаг</span>{" "}
              үлдлээ • <span className="whitespace-nowrap sm:whitespace-normal">{info.expText}</span>
            </p>
          </div>
          <a
            href="/vip"
            className="inline-flex items-center justify-center rounded-[9px] px-4 py-2.5 text-[12px] font-bold w-full sm:w-auto transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))", color: "#07070e" }}
          >
            VIP авах
          </a>
        </div>
      </div>
    </div>
  );
}
