"use client";

import { useEffect, useState } from "react";

type LockData = {
  code?: string;
  lockUntil?: string;
  remainingSeconds?: number;
  reason?: string;
  devicePolicy?: {
    status: "locked";
    count?: number;
    minutesLocked?: number;
  };
};

export default function LockModal() {
  const [lockData, setLockData] = useState<LockData | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    const handleLock = (e: CustomEvent<LockData>) => {
      setLockData(e.detail);
      setRemainingSeconds(e.detail.remainingSeconds || null);
    };

    window.addEventListener("user-locked", handleLock as EventListener);
    return () => {
      window.removeEventListener("user-locked", handleLock as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!remainingSeconds || remainingSeconds <= 0) {
      if (remainingSeconds === 0) {
        // Lock expired, clear after a moment
        setTimeout(() => setLockData(null), 2000);
      }
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  if (!lockData || !lockData.lockUntil) return null;

  const formatTime = (secs: number) => {
    if (secs <= 0) return "0 секунд";
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const sec = secs % 60;
    if (hours > 0) return `${hours}ц ${mins}м ${sec}с`;
    if (mins > 0) return `${mins}м ${sec}с`;
    return `${sec}с`;
  };

  const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900/95 p-6 shadow-2xl shadow-rose-500/20">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🔒</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-rose-100">
              {isExpired ? "Түгжлээ тайлагдлаа" : "Түр түгжигдсэн"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {lockData.reason || "Олон төхөөрөмжөөс нэвтрэх оролдлого илэрсэн"}
            </p>

            {lockData.devicePolicy && (
              <p className="mt-2 text-xs text-slate-400">
                Төхөөрөмж солилт: {lockData.devicePolicy.count} удаа
                {lockData.devicePolicy.minutesLocked && (
                  <span className="ml-2">
                    ({lockData.devicePolicy.minutesLocked} минут түгжсэн)
                  </span>
                )}
              </p>
            )}

            {!isExpired && remainingSeconds !== null && (
              <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                <p className="text-xs text-rose-200">Үлдсэн хугацаа:</p>
                <p className="mt-1 text-lg font-bold text-rose-100">
                  {formatTime(remainingSeconds)}
                </p>
              </div>
            )}

            {isExpired && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm text-emerald-200">
                  Түгжлээ тайлагдлаа. Дахин нэвтэрнэ үү.
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {isExpired ? (
                <button
                  onClick={() => {
                    setLockData(null);
                    window.location.reload();
                  }}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Дахин нэвтрэх
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Refresh to check if lock expired
                    window.location.reload();
                  }}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
                >
                  Дахин шалгах
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

