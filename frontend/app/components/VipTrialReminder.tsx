/* eslint-disable react-hooks/purity */
"use client";

import { useMemo } from "react";

type Props = {
  isVIP?: boolean;
  vipExpiresAt?: string | null;
};

export default function VipTrialReminder({ isVIP, vipExpiresAt }: Props) {
  const info = useMemo(() => {
    if (!isVIP || !vipExpiresAt) return null;

    const now = Date.now();
    const exp = new Date(vipExpiresAt).getTime();
    if (Number.isNaN(exp)) return null;

    const diffMs = exp - now;
    if (diffMs <= 0) return null;

    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 24) return null;

    return {
      hoursLeft: Math.ceil(diffHours),
      expText: new Date(vipExpiresAt).toLocaleString(),
    };
  }, [isVIP, vipExpiresAt]);

  if (!info) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-0">
      <div
        className="
          mt-3 mb-3
          rounded-2xl border border-amber-400/35
          bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-transparent
          p-3 sm:p-4
          shadow-lg shadow-black/30
          backdrop-blur
        "
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-300/30">
                ⏳
              </span>
              <span className="truncate">VIP эрх дуусах гэж байна</span>
            </p>

            <p className="mt-1 text-[12px] leading-snug text-amber-100/75">
              <span className="font-semibold text-amber-100/90">
                {info.hoursLeft} цаг
              </span>{" "}
              үлдлээ •{" "}
              <span className="whitespace-nowrap sm:whitespace-normal">
                {info.expText}
              </span>
            </p>
          </div>

          {/* Right (button) */}
          <a
            href="/vip"
            className="
              inline-flex items-center justify-center
              rounded-xl
              bg-amber-400 px-4 py-2.5
              text-[12px] font-bold text-slate-950
              hover:bg-amber-300 active:scale-[0.99]
              w-full sm:w-auto
            "
          >
            VIP авах
          </a>
        </div>
      </div>
    </div>
  );
}
