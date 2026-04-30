/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type PopupData = { at: number; days?: number };

export default function TrialSurprise() {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(3);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("trial_popup");
      if (!raw) return;
      const data = JSON.parse(raw) as PopupData;
      if (!data?.at || Date.now() - data.at > 10 * 60 * 1000) {
        localStorage.removeItem("trial_popup");
        return;
      }
      setDays(typeof data.days === "number" ? data.days : 3);
      setOpen(true);
      const t = setTimeout(() => {
        setOpen(false);
        localStorage.removeItem("trial_popup");
      }, 5200);
      return () => clearTimeout(t);
    } catch {
      localStorage.removeItem("trial_popup");
    }
  }, []);

  const dismiss = () => { setOpen(false); localStorage.removeItem("trial_popup"); };

  if (!open) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[320px] max-w-[calc(100vw-2.5rem)]">
      <div
        className="relative overflow-hidden rounded-[14px] p-4 shadow-xl"
        style={{ border: "1px solid oklch(0.72 0.17 195/.3)", background: "var(--arc-card)", backdropFilter: "blur(16px)" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl" style={{ background: "oklch(0.72 0.17 195/.15)" }} />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-28 w-28 rounded-full blur-2xl" style={{ background: "oklch(0.65 0.22 15/.1)" }} />

        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[10px] text-lg shrink-0"
            style={{ background: "var(--arc-cyan-dim)", border: "1px solid oklch(0.72 0.17 195/.3)" }}
          >
            🎁
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>
              Surprise! Trial идэвхжлээ
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--arc-dim)" }}>
              Та{" "}
              <span className="font-semibold" style={{ color: "var(--arc-cyan)" }}>{days} хоног</span>{" "}
              VIP контент үзэх эрхтэй боллоо ✨
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={dismiss}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all hover:brightness-110"
                style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
              >
                Ок 😄
              </button>
              <button
                onClick={dismiss}
                className="rounded-full px-3 py-1.5 text-[12px] transition-colors"
                style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
              >
                Дараа
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
          <div className="h-full w-full animate-[shrink_5.2s_linear_forwards]" style={{ background: "var(--arc-cyan)" }} />
        </div>

        <style jsx>{`
          @keyframes shrink {
            from { transform: translateX(0%); }
            to { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    </div>
  );
}
