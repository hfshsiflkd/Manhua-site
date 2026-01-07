"use client";

import { useEffect, useState } from "react";
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

  return (
    <AdminShell>
      <div className="space-y-6">
        {loading && <div className="text-sm text-slate-400">Loading...</div>}
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

            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-lg shadow-black/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-amber-100">Record VIP payment + extend</h3>
                  <p className="text-xs text-amber-200/80">
                    This increases the monthly site balance for the payment month.
                  </p>
                </div>
                <div className="text-xs text-amber-200">
                  {user.vipExpiresAt ? `VIP until ${new Date(user.vipExpiresAt).toLocaleDateString()}` : "No VIP"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-amber-200/80">Amount (MNT)</label>
                  <input
                    type="number"
                    min={0}
                    value={vipAmount}
                    onChange={(e) => setVipAmount(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-amber-500/30 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-amber-200/80">Paid at</label>
                  <input
                    type="date"
                    value={vipPaidAt}
                    onChange={(e) => setVipPaidAt(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/30 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-amber-200/80">Note</label>
                  <input
                    type="text"
                    value={vipNote}
                    onChange={(e) => setVipNote(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-amber-500/30 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {vipError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {vipError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {[1, 3, 6].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleGrantVip(m)}
                    disabled={vipBusy}
                    className="rounded-full border border-amber-400/70 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-500/20 disabled:opacity-60"
                  >
                    +{m} month{m > 1 ? "s" : ""}
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

