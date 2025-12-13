/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { UserRole } from "@/lib/api";

type CreateForm = {
  username: string;
  email: string;
  password: string;
  role: UserRole;
};

type Props = {
  open: boolean;
  saving: boolean;
  form: CreateForm;
  onClose: () => void;
  onChange: (next: CreateForm) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function CreateUserModal({
  open,
  saving,
  form,
  onClose,
  onChange,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Create new user</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-sm"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">
              Username<span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={form.username}
              onChange={(e) => onChange({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">
              Email<span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={form.email}
              onChange={(e) => onChange({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">
              Password<span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={form.password}
              onChange={(e) => onChange({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Role</label>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              value={form.role}
              onChange={(e) =>
                onChange({ ...form, role: e.target.value as any })
              }
            >
              <option value="user">User</option>
              <option value="translator">Translator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow shadow-cyan-500/40 disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
