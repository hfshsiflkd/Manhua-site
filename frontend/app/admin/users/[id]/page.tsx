"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import {
  adminGetUser,
  adminUpdateUser,
  adminResetPassword,
  adminForceLogout,
  adminBlockUser,
  adminUnblockUser,
  adminGrantVip,
  AdminUser,
} from "@/lib/adminUsers";
import EditUserForm from "../components/EditUserForm";
import ResetPasswordModal from "../components/ResetPasswordModal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "block" | "unblock" | "logout">(null);
  const [vipAmount, setVipAmount] = useState<string>("");
  const [vipPaidAt, setVipPaidAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [vipNote, setVipNote] = useState<string>("");
  const [vipBusy, setVipBusy] = useState(false);
  const [vipError, setVipError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminGetUser(id);
      setUser(res);
    } catch {
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (payload: Partial<AdminUser>) => {
    await adminUpdateUser(id, payload);
    await load();
  };

  const handleReset = async (payload: { newPassword?: string; generateRandom?: boolean }) => {
    await adminResetPassword(id, payload);
    setResetOpen(false);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm === "block") await adminBlockUser(id);
    if (confirm === "unblock") await adminUnblockUser(id);
    if (confirm === "logout") await adminForceLogout(id);
    setConfirm(null);
    await load();
  };

  const handleGrantVip = async (months: number) => {
    if (!user) return;
    setVipBusy(true);
    setVipError(null);
    try {
      const amountNum = vipAmount.trim() ? Number(vipAmount) : undefined;
      const paidAt = vipPaidAt ? new Date(vipPaidAt).toISOString() : undefined;
      const updated = await adminGrantVip(user._id, {
        months,
        amount: amountNum,
        paidAt,
        note: vipNote || undefined,
      });
      setUser(updated);
    } catch (e: any) {
      setVipError(e?.response?.data?.message || "Failed to grant VIP");
    } finally {
      setVipBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
    background: "var(--arc-elevated)", padding: "8px 12px", fontSize: 12,
    color: "var(--arc-text)", outline: "none",
  };

  return (
    <AdminShell title="Хэрэглэгч дэлгэрэнгүй" subtitle="Хэрэглэгчийн мэдээлэл засах, VIP олгох.">
      <div className="space-y-6">
        {loading && <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Ачаалж байна...</div>}
        {user && (
          <>
            <EditUserForm
              user={user}
              onSave={handleSave}
              onResetPassword={() => setResetOpen(true)}
              onForceLogout={() => setConfirm("logout")}
              onBlock={() => setConfirm("block")}
              onUnblock={() => setConfirm("unblock")}
            />

            <div className="rounded-[14px] p-5 space-y-4" style={{ border: "1px solid oklch(0.82 0.16 85/.35)", background: "var(--arc-card)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold" style={{ color: "var(--arc-amber)" }}>VIP төлбөр бүртгэх + сунгах</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--arc-muted)" }}>
                    Төлбөрийн сар дахь сарын балансыг нэмнэ.
                  </p>
                </div>
                <div className="text-[11px]" style={{ color: "var(--arc-dim)" }}>
                  {user.vipExpiresAt ? `VIP дуусах: ${new Date(user.vipExpiresAt).toLocaleDateString()}` : "VIP байхгүй"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Дүн (MNT)</label>
                  <input
                    type="number"
                    min={0}
                    value={vipAmount}
                    onChange={(e) => setVipAmount(e.target.value)}
                    placeholder="Сонголттой"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.82 0.16 85/.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Төлсөн огноо</label>
                  <input
                    type="date"
                    value={vipPaidAt}
                    onChange={(e) => setVipPaidAt(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.82 0.16 85/.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Тэмдэглэл</label>
                  <input
                    type="text"
                    value={vipNote}
                    onChange={(e) => setVipNote(e.target.value)}
                    placeholder="Сонголттой"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.82 0.16 85/.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--arc-border)")}
                  />
                </div>
              </div>

              {vipError && (
                <div className="rounded-[9px] px-3 py-2 text-[11px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
                  {vipError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {[1, 3, 6].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleGrantVip(m)}
                    disabled={vipBusy}
                    className="rounded-[8px] px-4 py-1.5 text-[11px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: "var(--arc-amber)", color: "#07070e", border: "none", cursor: "pointer" }}
                  >
                    +{m} сар
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <ResetPasswordModal
        userId={resetOpen ? id : null}
        onClose={() => setResetOpen(false)}
        onSubmit={handleReset}
      />

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm === "logout"
            ? "Force logout this user?"
            : confirm === "block"
            ? "Block this user?"
            : "Unblock this user?"
        }
        description="This action is immediate and will be audited."
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </AdminShell>
  );
}

