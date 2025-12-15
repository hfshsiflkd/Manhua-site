"use client";

import { AdminUser } from "@/lib/adminUsers";

export default function EditUserForm({
  user,
  onSave,
  onResetPassword,
  onForceLogout,
  onBlock,
  onUnblock,
}: {
  user: AdminUser;
  onSave: (payload: Partial<AdminUser>) => Promise<void>;
  onResetPassword: () => void;
  onForceLogout: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{user.username}</h2>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
        <span className="text-xs rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-200">
          {user.role}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Phone" defaultValue={user.phone || ""} onSave={(v) => onSave({ phone: v })} />
        <Field label="Role" defaultValue={user.role} onSave={(v) => onSave({ role: v as any })} />
        <Field
          label="VIP expires at"
          type="date"
          defaultValue={user.vipExpiresAt ? new Date(user.vipExpiresAt).toISOString().slice(0, 10) : ""}
          onSave={(v) => onSave({ vipExpiresAt: v ? new Date(v).toISOString() : null })}
        />
        <Field label="VIP level" type="number" defaultValue={user.vipLevel?.toString() || "0"} onSave={(v) => onSave({ vipLevel: Number(v) })} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onResetPassword}
          className="rounded-full border border-amber-500/70 text-amber-100 px-3 py-1.5 text-xs hover:bg-amber-500/10"
        >
          Reset password
        </button>
        <button
          onClick={onForceLogout}
          className="rounded-full border border-cyan-500/70 text-cyan-100 px-3 py-1.5 text-xs hover:bg-cyan-500/10"
        >
          Force logout
        </button>
        {user.blocked ? (
          <button
            onClick={onUnblock}
            className="rounded-full border border-emerald-500/70 text-emerald-100 px-3 py-1.5 text-xs hover:bg-emerald-500/10"
          >
            Unblock
          </button>
        ) : (
          <button
            onClick={onBlock}
            className="rounded-full border border-rose-500/70 text-rose-100 px-3 py-1.5 text-xs hover:bg-rose-500/10"
          >
            Block
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  defaultValue,
  onSave,
}: {
  label: string;
  type?: string;
  defaultValue: string;
  onSave: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        onBlur={(e) => onSave(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
      />
    </div>
  );
}

