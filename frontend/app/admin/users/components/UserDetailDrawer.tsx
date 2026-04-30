"use client";

import { useEffect, useState } from "react";
import { AdminUser, adminGrantVip } from "@/lib/adminUsers";

const AVATAR_GRADIENTS = [
  ["linear-gradient(135deg,oklch(0.72 0.17 195),oklch(0.65 0.22 15))", "#fff"],
  ["linear-gradient(135deg,oklch(0.65 0.2 290),oklch(0.72 0.17 195))", "#fff"],
  ["linear-gradient(135deg,oklch(0.82 0.16 85),oklch(0.65 0.22 15))", "#07070e"],
  ["linear-gradient(135deg,oklch(0.72 0.17 155),oklch(0.72 0.17 195))", "#07070e"],
];

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "8px 12px", fontSize: 12,
  color: "var(--arc-text)", outline: "none",
};

export default function UserDetailDrawer({ user, onClose, onSave, onUserUpdated }: {
  user: AdminUser | null;
  onClose: () => void;
  onSave: (id: string, payload: Partial<AdminUser>) => Promise<void>;
  onUserUpdated?: (user: AdminUser) => void;
}) {
  const [draft, setDraft] = useState<Partial<AdminUser> | null>(null);
  const [vipAmount, setVipAmount] = useState("");
  const [vipPaidAt, setVipPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [vipNote, setVipNote] = useState("");
  const [vipBusy, setVipBusy] = useState(false);
  const [vipError, setVipError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(user || null); setVipError(null); }, [user]);

  if (!user || !draft) return null;

  const changed = JSON.stringify({ ...user, ...draft }) !== JSON.stringify(user);
  const now = new Date();
  const initial = user.username.charAt(0).toUpperCase();
  const avatarGrad = AVATAR_GRADIENTS[user.username.charCodeAt(0) % AVATAR_GRADIENTS.length];
  const isVip = draft.vipExpiresAt && new Date(draft.vipExpiresAt) > now;
  const isLocked = draft.lockUntil && new Date(draft.lockUntil) > now;

  const addMonths = (months: number) => {
    setVipBusy(true);
    setVipError(null);
    const amountNum = vipAmount.trim() ? Number(vipAmount) : undefined;
    adminGrantVip(user._id, {
      months,
      amount: amountNum,
      paidAt: vipPaidAt ? new Date(vipPaidAt).toISOString() : undefined,
      note: vipNote || undefined,
    })
      .then((updated) => { setDraft(updated); onUserUpdated?.(updated); })
      .catch((e: any) => setVipError(e?.response?.data?.message || "VIP олгоход алдаа гарлаа"))
      .finally(() => setVipBusy(false));
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(user._id, draft); } finally { setSaving(false); }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[101] flex flex-col overflow-hidden"
        style={{
          width: 380, background: "var(--arc-card)",
          borderLeft: "1px solid var(--arc-border)",
          boxShadow: "-20px 0 60px rgba(0,0,0,.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "18px 20px", borderBottom: "1px solid var(--arc-border)" }}
        >
          <h2
            className="text-[15px] font-bold"
            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff" }}
          >
            Хэрэглэгчийн дэлгэрэнгүй
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-muted)", cursor: "pointer" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>

          {/* Avatar + name + badges */}
          <div className="text-center mb-5">
            <div
              className="mx-auto mb-3.5 flex items-center justify-center"
              style={{
                width: 56, height: 56, borderRadius: 14,
                background: avatarGrad[0], color: avatarGrad[1],
                fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
                fontSize: 22, fontWeight: 700,
                border: "2px solid var(--arc-border)",
              }}
            >
              {initial}
            </div>
            <div className="text-[18px] font-bold mb-1" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff" }}>
              {user.username}
            </div>
            <div className="text-[12px] mb-4" style={{ color: "var(--arc-muted)" }}>{user.email}</div>

            {/* Badges */}
            <div className="flex justify-center flex-wrap gap-1.5">
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}>
                {user.role || "user"}
              </span>
              {isVip && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{ background: "oklch(0.82 0.16 85/.1)", border: "1px solid oklch(0.82 0.16 85/.3)", color: "var(--arc-amber)" }}>
                  ⭐ VIP
                </span>
              )}
              {user.blocked && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{ background: "oklch(0.65 0.22 15/.1)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "var(--arc-rose)" }}>
                  🚫 Blocked
                </span>
              )}
              {isLocked && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.2)", color: "var(--arc-amber)" }}>
                  🔒 Locked
                </span>
              )}
              {!user.blocked && !isLocked && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{ background: "oklch(0.72 0.17 155/.1)", border: "1px solid oklch(0.72 0.17 155/.3)", color: "oklch(0.8 0.14 155)" }}>
                  ✓ Active
                </span>
              )}
            </div>
          </div>

          {/* Info rows */}
          <div className="mb-5">
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>Мэдээлэл</div>
            {[
              ["Бүртгүүлсэн", user.createdAt ? new Date(user.createdAt).toLocaleDateString("mn-MN") : "—"],
              ["VIP дуусах", draft.vipExpiresAt ? new Date(draft.vipExpiresAt).toLocaleDateString("mn-MN") : "—"],
              ["VIP level", String(draft.vipLevel ?? 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-[12px]" style={{ padding: "8px 0", borderBottom: "1px solid var(--arc-border)" }}>
                <span style={{ color: "var(--arc-muted)" }}>{label}</span>
                <span className="font-medium" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{value}</span>
              </div>
            ))}
            {isLocked && draft.lockUntil && (
              <div className="flex items-center justify-between text-[12px]" style={{ padding: "8px 0", borderBottom: "1px solid var(--arc-border)" }}>
                <span style={{ color: "var(--arc-muted)" }}>Locked until</span>
                <span className="font-medium" style={{ color: "var(--arc-rose)" }}>{new Date(draft.lockUntil).toLocaleDateString("mn-MN")}</span>
              </div>
            )}
          </div>

          {/* Edit fields */}
          <div className="mb-5">
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--arc-muted)" }}>Засах</div>
            <div className="space-y-2.5">
              {[
                { label: "Username", key: "username" as const },
                { label: "Email", key: "email" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>{label}</label>
                  <input style={fieldStyle} value={(draft[key] as string) || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Role</label>
                <select style={fieldStyle} value={draft.role || "user"} onChange={(e) => setDraft({ ...draft, role: e.target.value as AdminUser["role"] })}>
                  {["user", "translator", "editor", "admin"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>VIP дуусах огноо</label>
                <input type="date" style={fieldStyle}
                  value={draft.vipExpiresAt ? new Date(draft.vipExpiresAt).toISOString().slice(0, 10) : ""}
                  onChange={(e) => setDraft({ ...draft, vipExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </div>
          </div>

          {/* VIP grant */}
          <div className="mb-5 rounded-[12px] p-4" style={{ border: "1px solid oklch(0.82 0.16 85/.3)", background: "oklch(0.82 0.16 85/.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--arc-amber)" }}>VIP эрх нэмэх</div>
              <span className="text-[10px]" style={{ color: "var(--arc-amber)" }}>
                {isVip ? `${Math.ceil((new Date(draft.vipExpiresAt!).getTime() - now.getTime()) / 86400000)} өдөр үлдсэн` : "VIP байхгүй"}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              {[
                { label: "Дүн (₮)", type: "number", value: vipAmount, set: setVipAmount, placeholder: "Заавал биш" },
                { label: "Төлсөн огноо", type: "date", value: vipPaidAt, set: setVipPaidAt, placeholder: "" },
                { label: "Тэмдэглэл", type: "text", value: vipNote, set: setVipNote, placeholder: "Заавал биш" },
              ].map(({ label, type, value, set, placeholder }) => (
                <div key={label}>
                  <label className="block mb-1 text-[11px]" style={{ color: "oklch(0.82 0.16 85/.8)" }}>{label}</label>
                  <input type={type} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                    style={{ ...fieldStyle, border: "1px solid oklch(0.82 0.16 85/.25)" }} />
                </div>
              ))}
            </div>

            {vipError && (
              <div className="mb-3 rounded-[8px] px-3 py-2 text-[11px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
                {vipError}
              </div>
            )}

            <div className="flex gap-2">
              {[1, 3, 6].map((m) => (
                <button key={m} onClick={() => addMonths(m)} disabled={vipBusy}
                  className="flex-1 rounded-[8px] py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ border: "1px solid oklch(0.82 0.16 85/.4)", color: "var(--arc-amber)", background: "oklch(0.82 0.16 85/.1)", cursor: "pointer" }}>
                  +{m}м
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--arc-muted)" }}>Үйлдэл</div>
            {user.blocked ? (
              <button
                onClick={() => setDraft({ ...draft, blocked: false })}
                className="w-full rounded-[9px] py-2.5 text-[13px] font-semibold transition-colors"
                style={{ background: "oklch(0.72 0.17 155/.1)", color: "oklch(0.8 0.14 155)", border: "1px solid oklch(0.72 0.17 155/.3)", cursor: "pointer" }}
              >
                Блоклолт арилгах
              </button>
            ) : (
              <button
                onClick={() => setDraft({ ...draft, blocked: true })}
                className="w-full rounded-[9px] py-2.5 text-[13px] font-semibold transition-colors"
                style={{ background: "oklch(0.65 0.22 15/.1)", color: "var(--arc-rose)", border: "1px solid oklch(0.65 0.22 15/.3)", cursor: "pointer" }}
              >
                Блоклох
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-end gap-2"
          style={{ padding: "14px 20px", borderTop: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          <button onClick={onClose}
            className="rounded-[9px] px-4 py-2 text-[12px] font-medium"
            style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}>
            Болих
          </button>
          <button disabled={!changed || saving} onClick={handleSave}
            className="rounded-[9px] px-5 py-2 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}>
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </>
  );
}
