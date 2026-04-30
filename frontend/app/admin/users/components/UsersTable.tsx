"use client";

import { AdminUser } from "@/lib/adminUsers";

const AVATAR_GRADIENTS = [
  ["linear-gradient(135deg,oklch(0.72 0.17 195),oklch(0.65 0.22 15))", "#fff"],
  ["linear-gradient(135deg,oklch(0.65 0.2 290),oklch(0.72 0.17 195))", "#fff"],
  ["linear-gradient(135deg,oklch(0.82 0.16 85),oklch(0.65 0.22 15))", "#07070e"],
  ["linear-gradient(135deg,oklch(0.72 0.17 155),oklch(0.72 0.17 195))", "#07070e"],
];

function vipStatus(user: AdminUser) {
  if (!user.vipExpiresAt) return null;
  const exp = new Date(user.vipExpiresAt);
  if (exp <= new Date()) return null;
  const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
  return `VIP · ${days}д`;
}

function lockStatus(user: AdminUser) {
  if (!user.lockUntil) return null;
  const lockDate = new Date(user.lockUntil);
  if (lockDate <= new Date()) return null;
  const diffMin = Math.ceil((lockDate.getTime() - Date.now()) / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return diffHr > 0 ? `${diffHr}h ${remMin}m` : `${diffMin}m`;
}

const actBtn: React.CSSProperties = {
  padding: "3px 9px", borderRadius: 6,
  border: "1px solid var(--arc-border)", background: "transparent",
  color: "var(--arc-dim)", fontSize: 10, cursor: "pointer",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  transition: "color .12s, border-color .12s",
};

export default function UsersTable({ users, loading, onSelect, onBlock, onUnblock, onLock, onUnlock, onForceLogout, onResetPassword }: {
  users: AdminUser[];
  loading: boolean;
  onSelect: (u: AdminUser) => void;
  onBlock: (u: AdminUser) => void;
  onUnblock: (u: AdminUser) => void;
  onLock: (u: AdminUser) => void;
  onUnlock: (u: AdminUser) => void;
  onForceLogout: (u: AdminUser) => void;
  onResetPassword: (u: AdminUser) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-[10px]" style={{ background: "var(--arc-elevated)" }} />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="py-12 text-center text-[13px] rounded-[14px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-muted)" }}>
        Хэрэглэгч олдсонгүй
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "rgba(0,0,0,.2)", borderBottom: "1px solid var(--arc-border)" }}>
            <tr>
              {["Хэрэглэгч", "Role", "VIP", "Статус", "Бүртгүүлсэн", ""].map((h, i) => (
                <th key={i} style={{
                  padding: "9px 16px", textAlign: i === 5 ? "right" : "left",
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "var(--arc-muted)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const grad = AVATAR_GRADIENTS[user.username.charCodeAt(0) % AVATAR_GRADIENTS.length];
              const initial = user.username.charAt(0).toUpperCase();
              const vip = vipStatus(user);
              const lock = lockStatus(user);

              return (
                <tr
                  key={user._id}
                  style={{ borderTop: "1px solid var(--arc-border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  {/* User */}
                  <td style={{ padding: "10px 16px" }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="shrink-0 flex items-center justify-center text-[12px] font-bold"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: grad[0], color: grad[1],
                          fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
                        }}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => onSelect(user)}
                          className="block font-semibold text-[12px] truncate transition-colors hover:underline text-left"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--arc-text)", maxWidth: 160, padding: 0 }}
                        >
                          {user.username}
                        </button>
                        <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--arc-muted)", maxWidth: 160 }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}>
                      {user.role || "user"}
                    </span>
                  </td>

                  {/* VIP */}
                  <td style={{ padding: "10px 16px" }}>
                    {vip ? (
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "oklch(0.82 0.16 85/.1)", border: "1px solid oklch(0.82 0.16 85/.3)", color: "var(--arc-amber)" }}>
                        ⭐ {vip}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--arc-muted)" }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "10px 16px" }}>
                    <div className="flex flex-col gap-1">
                      {user.blocked ? (
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, display: "inline-block", background: "oklch(0.65 0.22 15/.1)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "var(--arc-rose)" }}>
                          🚫 Blocked
                        </span>
                      ) : lock ? (
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, display: "inline-block", background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.2)", color: "var(--arc-amber)" }}>
                          🔒 {lock}
                        </span>
                      ) : (
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, display: "inline-block", background: "oklch(0.72 0.17 155/.1)", border: "1px solid oklch(0.72 0.17 155/.3)", color: "oklch(0.8 0.14 155)" }}>
                          ✓ Active
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td style={{ padding: "10px 16px", fontSize: 11, color: "var(--arc-muted)" }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString("mn-MN") : "—"}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "10px 16px" }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelect(user)}
                        style={actBtn}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; }}
                      >
                        Дэлгэрэнгүй
                      </button>
                      <button
                        onClick={() => onResetPassword(user)}
                        style={{ ...actBtn, borderColor: "oklch(0.82 0.16 85/.3)", color: "var(--arc-amber)", background: "oklch(0.82 0.16 85/.08)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.82 0.16 85/.15)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.82 0.16 85/.08)"; }}
                      >
                        PW reset
                      </button>
                      <button
                        onClick={() => onForceLogout(user)}
                        style={{ ...actBtn, borderColor: "oklch(0.72 0.17 195/.3)", color: "var(--arc-cyan)", background: "oklch(0.72 0.17 195/.08)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 195/.15)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 195/.08)"; }}
                      >
                        Logout
                      </button>
                      {lock ? (
                        <button
                          onClick={() => onUnlock(user)}
                          style={{ ...actBtn, borderColor: "oklch(0.72 0.17 155/.3)", color: "oklch(0.8 0.14 155)", background: "oklch(0.72 0.17 155/.08)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 155/.15)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 155/.08)"; }}
                        >
                          Unlock
                        </button>
                      ) : (
                        <button
                          onClick={() => onLock(user)}
                          style={actBtn}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.13)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; }}
                        >
                          Lock
                        </button>
                      )}
                      {user.blocked ? (
                        <button
                          onClick={() => onUnblock(user)}
                          style={{ ...actBtn, borderColor: "oklch(0.72 0.17 155/.3)", color: "oklch(0.8 0.14 155)", background: "oklch(0.72 0.17 155/.08)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 155/.15)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 155/.08)"; }}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => onBlock(user)}
                          style={{ ...actBtn, borderColor: "oklch(0.65 0.22 15/.3)", color: "var(--arc-rose)", background: "oklch(0.65 0.22 15/.08)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.22 15/.15)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.22 15/.08)"; }}
                        >
                          Block
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
