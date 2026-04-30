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

export default function TrialSettingsCard({ trial, trialLoading, trialSaving, trialError, onRefresh, onSave, onChange }: Props) {
  return (
    <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: "var(--arc-text)" }}>Trial тохиргоо</h3>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--arc-muted)" }}>Шинэ хэрэглэгчид олгох trial (VIP) хугацааг удирдана.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} disabled={trialLoading} className="rounded-[9px] px-3 py-2 text-[12px] font-medium transition-colors disabled:opacity-60"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}>
            {trialLoading ? "Шинэчилж байна..." : "Шинэчлэх"}
          </button>
          <button onClick={onSave} disabled={trialSaving || trialLoading || !trial} className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}>
            {trialSaving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>

      {trialError && (
        <div className="mt-3 rounded-[9px] px-3 py-2 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {trialError}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-[12px] p-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
          <div className="flex items-center justify-between">
            <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Идэвхтэй</p>
            <input type="checkbox" checked={!!trial?.enabled} onChange={(e) => trial && onChange({ ...trial, enabled: e.target.checked })} className="h-4 w-4 accent-cyan-500" disabled={!trial} />
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Trial идэвхтэй бол шинэ бүртгэлд автоматаар VIP олгоно.</p>
        </div>

        <div className="rounded-[12px] p-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Trial хугацаа (өдөр)</p>
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={0} max={30} value={trial?.days ?? 3}
              onChange={(e) => trial && onChange({ ...trial, days: Number(e.target.value) })}
              className="w-24 rounded-[7px] px-2 py-1.5 text-[12px] outline-none"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)" }}
              disabled={!trial} />
            <span className="text-[12px]" style={{ color: "var(--arc-muted)" }}>days</span>
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>0 бол trial олгохгүй (enabled=true байсан ч).</p>
        </div>

        <div className="rounded-[12px] p-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Тайлбар</p>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--arc-muted)" }}>
            Trial нь <span style={{ color: "var(--arc-text)" }}>нэг төхөөрөмж дээр 1 удаа</span> олгогдоно. (x-device-id/deviceId-р хянагдана)
          </p>
        </div>
      </div>
    </div>
  );
}
