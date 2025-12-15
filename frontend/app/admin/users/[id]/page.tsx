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

  return (
    <AdminShell>
      <div className="space-y-6">
        {loading && <div className="text-sm text-slate-400">Loading...</div>}
        {user && (
          <EditUserForm
            user={user}
            onSave={handleSave}
            onResetPassword={() => setResetOpen(true)}
            onForceLogout={() => setConfirm("logout")}
            onBlock={() => setConfirm("block")}
            onUnblock={() => setConfirm("unblock")}
          />
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

