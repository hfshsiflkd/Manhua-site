"use client";

import { AdminUser } from "@/lib/adminUsers";

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "9px 14px", fontSize: 13,
  color: "var(--arc-text)", outline: "none",
};

const btnBase: React.CSSProperties = { borderRadius: 9999, fontSize: 11, padding: "4px 12px", cursor: "pointer", border: "1px solid", background: "transparent" };

export default function EditUserForm({ user, onSave, onResetPassword, onForceLogout, onBlock, onUnblock }: {
  user: AdminUser;
  onSave: (payload: Partial<AdminUser>) => Promise<void>;
  onResetPassword: () => void;
  onForceLogout: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  return (
    <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>{user.username}</h2>
          <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{user.email}</p>
        </div>
        <span className="text-[11px] rounded-full px-2 py-0.5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
          {user.role}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Phone" defaultValue={user.phone || ""} onSave={(v) => onSave({ phone: v })} />
        <Field label="Role" defaultValue={user.role} onSave={(v) => onSave({ role: v as any })} />
        <Field label="VIP expires at" type="date" defaultValue={user.vipExpiresAt ? new Date(user.vipExpiresAt).toISOString().slice(0, 10) : ""}
          onSave={(v) => onSave({ vipExpiresAt: v ? new Date(v).toISOString() : null })} />
        <Field label="VIP level" type="number" defaultValue={user.vipLevel?.toString() || "0"} onSave={(v) => onSave({ vipLevel: Number(v) })} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onResetPassword} style={{ ...btnBase, borderColor: "oklch(0.82 0.16 85/.5)", color: "var(--arc-amber)" }}>Reset password</button>
        <button onClick={onForceLogout} style={{ ...btnBase, borderColor: "oklch(0.72 0.17 195/.4)", color: "var(--arc-cyan)" }}>Force logout</button>
        {user.blocked
          ? <button onClick={onUnblock} style={{ ...btnBase, borderColor: "oklch(0.75 0.17 145/.4)", color: "oklch(0.8 0.14 145)" }}>Unblock</button>
          : <button onClick={onBlock} style={{ ...btnBase, borderColor: "oklch(0.65 0.22 15/.4)", color: "oklch(0.85 0.12 15)" }}>Block</button>}
      </div>
    </div>
  );
}

function Field({ label, type = "text", defaultValue, onSave }: { label: string; type?: string; defaultValue: string; onSave: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{label}</label>
      <input type={type} defaultValue={defaultValue} onBlur={(e) => onSave(e.target.value)} style={fieldStyle} />
    </div>
  );
}
