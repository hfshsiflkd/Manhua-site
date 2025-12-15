"use client";

import { useState, useEffect } from "react";

export default function ResetPasswordModal({
  userId,
  onClose,
  onSubmit,
}: {
  userId: string | null;
  onClose: () => void;
  onSubmit: (payload: { newPassword?: string; generateRandom?: boolean }) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [generateRandom, setGenerateRandom] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPassword("");
      setConfirm("");
      setGenerateRandom(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Reset password</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-sm">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={generateRandom}
              onChange={(e) => setGenerateRandom(e.target.checked)}
              className="h-4 w-4 accent-cyan-500"
            />
            Generate random strong password
          </label>

          {!generateRandom && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">New password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-[11px] text-slate-500">
                  At least 8 chars, include letters and numbers.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Confirm password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              disabled={(!generateRandom && (!strongEnough || mismatch)) || saving}
              onClick={handle}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow shadow-cyan-500/40 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Reset password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

