/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { UserRole } from "@/lib/api";

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "9px 14px", fontSize: 13,
  color: "var(--arc-text)", outline: "none",
};

type CreateForm = { username: string; email: string; password: string; role: UserRole };
type Props = {
  open: boolean; saving: boolean; form: CreateForm;
  onClose: () => void; onChange: (next: CreateForm) => void; onSubmit: (e: React.FormEvent) => void;
};

export default function CreateUserModal({ open, saving, form, onClose, onChange, onSubmit }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-[16px] p-6 shadow-2xl" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Create new user</h2>
          <button onClick={onClose} className="text-[16px] leading-none opacity-50 hover:opacity-100" style={{ color: "var(--arc-dim)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {[
            { label: "Username", type: "text", key: "username" as const, required: true },
            { label: "Email", type: "email", key: "email" as const, required: true },
            { label: "Password", type: "password", key: "password" as const, required: true },
          ].map(({ label, type, key, required }) => (
            <div key={key} className="space-y-1">
              <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
                {label}{required && <span style={{ color: "var(--arc-rose)" }}>*</span>}
              </label>
              <input type={type} style={fieldStyle} value={form[key]} onChange={(e) => onChange({ ...form, [key]: e.target.value })} required={required} />
            </div>
          ))}

          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Role</label>
            <select style={fieldStyle} value={form.role} onChange={(e) => onChange({ ...form, role: e.target.value as any })}>
              <option value="user">User</option>
              <option value="translator">Translator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-[9px] px-3 py-2 text-[12px] font-medium transition-colors"
              style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}>
              {saving ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
