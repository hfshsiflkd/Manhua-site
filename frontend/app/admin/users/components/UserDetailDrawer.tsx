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

  const changed = JSON.stringify({ ...user, ...draft }) !== JSON.stringify(user);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <div className="w-full max-w-xl h-full overflow-y-auto bg-slate-950 border-l border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-50">User detail</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-sm">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <Input label="Username" value={draft.username || ""} onChange={(v) => setDraft({ ...draft, username: v })} />
          <Input label="Email" value={draft.email || ""} onChange={(v) => setDraft({ ...draft, email: v })} />
          <Input label="Phone" value={draft.phone || ""} onChange={(v) => setDraft({ ...draft, phone: v })} />
          <Select
            label="Role"
            value={draft.role || "user"}
            options={["user", "translator", "editor", "admin"]}
            onChange={(v) => setDraft({ ...draft, role: v as any })}
          />
          <Input
            label="VIP expires at"
            type="date"
            value={draft.vipExpiresAt ? new Date(draft.vipExpiresAt).toISOString().slice(0, 10) : ""}
            onChange={(v) => setDraft({ ...draft, vipExpiresAt: v ? new Date(v).toISOString() : null })}
          />
          <Input
            label="VIP level"
            type="number"
            value={draft.vipLevel?.toString() || "0"}
            onChange={(v) => setDraft({ ...draft, vipLevel: Number(v) })}
          />

          <TagInput
            label="Preferred activities"
            value={draft.preferredActivities || []}
            onChange={(arr) => setDraft({ ...draft, preferredActivities: arr })}
          />
          <TagInput
            label="Work values"
            value={draft.workValues || []}
            onChange={(arr) => setDraft({ ...draft, workValues: arr })}
          />
          <TagInput
            label="Energy boosts"
            value={draft.energyBoosts || []}
            onChange={(arr) => setDraft({ ...draft, energyBoosts: arr })}
          />
          <TagInput
            label="Going out"
            value={draft.goingOut || []}
            onChange={(arr) => setDraft({ ...draft, goingOut: arr })}
          />
          <TagInput
            label="Weekend"
            value={draft.weekend || []}
            onChange={(arr) => setDraft({ ...draft, weekend: arr })}
          />
          <TagInput
            label="Hobby"
            value={draft.hobby || []}
            onChange={(arr) => setDraft({ ...draft, hobby: arr })}
          />

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

function TagInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (arr: string[]) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-100"
          >
            {tag}
            <button onClick={() => onChange(value.filter((t) => t !== tag))}>✕</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              e.preventDefault();
              if (!value.includes(text.trim())) onChange([...value, text.trim()]);
              setText("");
            }
          }}
          placeholder="Type and press Enter to add"
        />
        <button
          onClick={() => {
            if (!text.trim()) return;
            if (!value.includes(text.trim())) onChange([...value, text.trim()]);
            setText("");
          }}
          className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700"
        >
          Add
        </button>
      </div>
    </div>
  );
}

