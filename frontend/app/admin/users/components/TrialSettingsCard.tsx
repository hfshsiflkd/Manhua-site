/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { TrialSettings } from "@/lib/api";

type Props = {
  trial: TrialSettings | null;
  trialLoading: boolean;
  trialSaving: boolean;
  trialError: string | null;
  onRefresh: () => void;
  onSave: () => void;
  onChange: (next: TrialSettings) => void;
};

export default function TrialSettingsCard({
  trial,
  trialLoading,
  trialSaving,
  trialError,
  onRefresh,
  onSave,
  onChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur shadow-xl shadow-black/30">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Trial Settings
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Шинэ хэрэглэгчид олгох trial (VIP) хугацааг удирдана.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 transition disabled:opacity-60"
            disabled={trialLoading}
          >
            {trialLoading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={onSave}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow shadow-cyan-500/30 disabled:opacity-60"
            disabled={trialSaving || trialLoading || !trial}
          >
            {trialSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {trialError && (
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {trialError}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Enabled</p>
            <input
              type="checkbox"
              checked={!!trial?.enabled}
              onChange={(e) =>
                trial && onChange({ ...trial, enabled: e.target.checked })
              }
              className="h-4 w-4 accent-cyan-500"
              disabled={!trial}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Trial идэвхтэй бол шинэ бүртгэлд автоматаар VIP олгоно.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-400">Trial Days</p>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={30}
              value={trial?.days ?? 3}
              onChange={(e) =>
                trial && onChange({ ...trial, days: Number(e.target.value) })
              }
              className="w-24 rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
              disabled={!trial}
            />
            <span className="text-xs text-slate-400">days</span>
          </div>

          <p className="mt-1 text-[11px] text-slate-500">
            0 бол trial олгохгүй (enabled=true байсан ч).
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-400">Info</p>
          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
            Trial нь{" "}
            <span className="text-slate-300">нэг төхөөрөмж дээр 1 удаа</span>{" "}
            олгогдоно. (x-device-id/deviceId-р хянагдана)
          </p>
        </div>
      </div>
    </div>
  );
}
