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
    <div className="mx-auto mt-3 mb-3 w-full max-w-3xl rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-lg shadow-black/30">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">⏳ Таны vip эрх дуусах гэж байна</p>
          <p className="text-[12px] text-amber-100/80">
            {info.hoursLeft} цагийн дараа дуусна • ({info.expText})
          </p>
        </div>

        <a
          href="/vip"
          className="mt-2 inline-flex w-fit items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-[12px] font-semibold text-slate-950 hover:bg-amber-300 md:mt-0"
        >
          VIP авах
        </a>
      </div>
    </div>
  );
}
