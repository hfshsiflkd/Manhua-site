"use client";

import { useState, useEffect } from "react";

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "9px 14px", fontSize: 13,
  color: "var(--arc-text)", outline: "none",
};

export default function ResetPasswordModal({ userId, onClose, onSubmit }: {
  userId: string | null;
  onClose: () => void;
  onSubmit: (payload: { newPassword?: string; generateRandom?: boolean }) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [generateRandom, setGenerateRandom] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) { setPassword(""); setConfirm(""); setGenerateRandom(false); }
  }, [userId]);

  if (!userId) return null;
  const strongEnough = password.length >= 8 && /\d/.test(password) && /[A-Za-z]/.test(password);
  const mismatch = password !== confirm;

  const handle = async () => {
    setSaving(true);
    await onSubmit(generateRandom ? { generateRandom: true } : { newPassword: password });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-[16px] p-6 shadow-2xl" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Reset password</h2>
          <button onClick={onClose} className="text-[16px] leading-none opacity-50 hover:opacity-100" style={{ color: "var(--arc-dim)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--arc-dim)" }}>
            <input type="checkbox" checked={generateRandom} onChange={(e) => setGenerateRandom(e.target.checked)} className="h-4 w-4 accent-cyan-500" />
            Generate random strong password
          </label>

          {!generateRandom && (
            <>
              <div className="space-y-1">
                <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>New password</label>
                <input type="password" style={fieldStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
                <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>At least 8 chars, include letters and numbers.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Confirm password</label>
                <input type="password" style={fieldStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-[9px] px-3 py-2 text-[12px] font-medium transition-colors" style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}>
              Cancel
            </button>
            <button
              disabled={(!generateRandom && (!strongEnough || mismatch)) || saving}
              onClick={handle}
              className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
            >
              {saving ? "Saving..." : "Reset password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
