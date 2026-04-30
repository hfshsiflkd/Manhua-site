"use client";

import { useEffect, useState } from "react";

type LockData = {
  code?: string;
  lockUntil?: string;
  remainingSeconds?: number;
  reason?: string;
  devicePolicy?: { status: "locked"; count?: number; minutesLocked?: number };
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
    return () => window.removeEventListener("user-locked", handleLock as EventListener);
  }, []);

  useEffect(() => {
    if (!remainingSeconds || remainingSeconds <= 0) {
      if (remainingSeconds === 0) setTimeout(() => setLockData(null), 2000);
      return;
    }
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev === null || prev <= 1 ? 0 : prev - 1));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-md rounded-[16px] p-6 shadow-2xl"
        style={{ border: "1px solid oklch(0.65 0.22 15/.4)", background: "var(--arc-card)" }}
      >
        <div className="flex items-start gap-3">
          <div className="text-3xl">🔒</div>
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold" style={{ color: isExpired ? "oklch(0.75 0.16 145)" : "oklch(0.85 0.12 15)" }}>
              {isExpired ? "Түгжлээ тайлагдлаа" : "Түр түгжигдсэн"}
            </h2>
            <p className="mt-2 text-[13px]" style={{ color: "var(--arc-dim)" }}>
              {lockData.reason || "Олон төхөөрөмжөөс нэвтрэх оролдлого илэрсэн"}
            </p>

            {lockData.devicePolicy && (
              <p className="mt-2 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                Төхөөрөмж солилт: {lockData.devicePolicy.count} удаа
                {lockData.devicePolicy.minutesLocked && <span className="ml-2">({lockData.devicePolicy.minutesLocked} минут түгжсэн)</span>}
              </p>
            )}

            {!isExpired && remainingSeconds !== null && (
              <div className="mt-4 rounded-[10px] p-3" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)" }}>
                <p className="text-[11px]" style={{ color: "oklch(0.8 0.1 15)" }}>Үлдсэн хугацаа:</p>
                <p className="mt-1 text-[20px] font-bold" style={{ color: "oklch(0.85 0.12 15)" }}>{formatTime(remainingSeconds)}</p>
              </div>
            )}

            {isExpired && (
              <div className="mt-4 rounded-[10px] p-3" style={{ background: "oklch(0.75 0.16 145/.08)", border: "1px solid oklch(0.75 0.16 145/.3)" }}>
                <p className="text-[13px]" style={{ color: "oklch(0.8 0.14 145)" }}>Түгжлээ тайлагдлаа. Дахин нэвтэрнэ үү.</p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {isExpired ? (
                <button
                  onClick={() => { setLockData(null); window.location.reload(); }}
                  className="rounded-[9px] px-4 py-2 text-[13px] font-semibold transition-all hover:brightness-110"
                  style={{ background: "oklch(0.72 0.16 145)", color: "#07070e", border: "none", cursor: "pointer" }}
                >
                  Дахин нэвтрэх
                </button>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-[9px] px-4 py-2 text-[13px] font-medium transition-colors"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
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
