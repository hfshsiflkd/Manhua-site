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

      // ✅ хуучин flag бол үзүүлэхгүй (ж: 10 минут өнгөрсөн бол)
      if (!data?.at || Date.now() - data.at > 10 * 60 * 1000) {
        localStorage.removeItem("trial_popup");
        return;
      }

      setDays(typeof data.days === "number" ? data.days : 3);
      setOpen(true);

      // ✅ 5 сек дараа автоматаар хаана
      const t = setTimeout(() => {
        setOpen(false);
        localStorage.removeItem("trial_popup");
      }, 5200);

      return () => clearTimeout(t);
    } catch {
      localStorage.removeItem("trial_popup");
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[320px] max-w-[calc(100vw-2.5rem)]">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950/90 p-4 shadow-xl shadow-cyan-500/10 ring-1 ring-slate-800/80 backdrop-blur">
        {/* glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-fuchsia-500/15 blur-2xl" />

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-lg">
            🎁
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-50">
              Surprise! Trial идэвхжлээ
            </p>
            <p className="mt-1 text-[12px] text-slate-300">
              Та{" "}
              <span className="font-semibold text-cyan-300">{days} хоног</span>{" "}
              VIP контент үзэх эрхтэй боллоо ✨
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  localStorage.removeItem("trial_popup");
                }}
                className="rounded-full bg-cyan-500 px-3 py-1.5 text-[12px] font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Ок 😄
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  localStorage.removeItem("trial_popup");
                }}
                className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[12px] text-slate-200 hover:bg-slate-900"
              >
                Дараа
              </button>
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-full animate-[shrink_5.2s_linear_forwards] bg-cyan-400/80" />
        </div>

        <style jsx>{`
          @keyframes shrink {
            from {
              transform: translateX(0%);
            }
            to {
              transform: translateX(-100%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
