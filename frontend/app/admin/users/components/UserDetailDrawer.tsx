"use client";

import { useEffect, useState } from "react";
import { AdminUser } from "@/lib/adminUsers";

export default function UserDetailDrawer({
  user,
  onClose,
  onSave,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSave: (id: string, payload: Partial<AdminUser>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Partial<AdminUser> | null>(null);

  useEffect(() => {
    setDraft(user || null);
  }, [user]);

  if (!user || !draft) return null;

  const changed =
    JSON.stringify({ ...user, ...draft }) !== JSON.stringify(user);
  const now = new Date();

  function addMonths(months: number) {
    if (!draft || !user) return;
    const base =
      draft.vipExpiresAt && new Date(draft.vipExpiresAt) > now
        ? new Date(draft.vipExpiresAt)
        : now;
    const newDate = new Date(base);
    newDate.setMonth(newDate.getMonth() + months);
    const iso = newDate.toISOString();
    setDraft((prev) => ({ ...prev, vipExpiresAt: iso }));
    onSave(user._id, { vipExpiresAt: iso });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <div className="w-full md:max-w-xl h-full overflow-y-auto bg-slate-950 border-l border-slate-800 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-50">User detail</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <Input
            label="Username"
            value={draft.username || ""}
            onChange={(v) => setDraft({ ...draft, username: v })}
          />
          <Input
            label="Email"
            value={draft.email || ""}
            onChange={(v) => setDraft({ ...draft, email: v })}
          />
          <Input
            label="Phone"
            value={draft.phone || ""}
            onChange={(v) => setDraft({ ...draft, phone: v })}
          />
          <Select
            label="Role"
            value={draft.role || "user"}
            options={["user", "translator", "editor", "admin"]}
            onChange={(v) => setDraft({ ...draft, role: v as any })}
          />
          <Input
            label="VIP expires at"
            type="date"
            value={
              draft.vipExpiresAt
                ? new Date(draft.vipExpiresAt).toISOString().slice(0, 10)
                : ""
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                vipExpiresAt: v ? new Date(v).toISOString() : null,
              })
            }
          />
          <Input
            label="VIP level"
            type="number"
            value={draft.vipLevel?.toString() || "0"}
            onChange={(v) => setDraft({ ...draft, vipLevel: Number(v) })}
          />

          {/* Lock Status */}
          {draft.lockUntil && new Date(draft.lockUntil) > now && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-rose-100">🔒 Locked</p>
                <span className="text-[11px] text-rose-200">
                  Until: {new Date(draft.lockUntil).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-rose-300">
                Reason: {draft.lockReason || "Unknown"}
              </p>
              {draft.deviceSwitchCount && draft.deviceSwitchCount > 0 && (
                <p className="text-[11px] text-rose-300">
                  Device switches: {draft.deviceSwitchCount}
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-100">
                VIP эрх нэмэх
              </p>
              <span className="text-[11px] text-amber-200">
                {draft.vipExpiresAt
                  ? `Дуусах: ${new Date(
                      draft.vipExpiresAt
                    ).toLocaleDateString()}`
                  : "VIP байхгүй"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 6].map((m) => (
                <button
                  key={m}
                  onClick={() => addMonths(m)}
                  className="rounded-full border border-amber-400/70 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-50 hover:bg-amber-500/20 transition"
                >
                  +{m} month{m > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              disabled={!changed}
              onClick={() => onSave(user._id, draft)}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow shadow-cyan-500/40 disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type={type}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400">{label}</label>
      <select
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
