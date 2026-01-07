"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import {
  AdminUser,
  adminListUsers,
  adminBlockUser,
  adminUnblockUser,
  adminForceLogout,
  adminResetPassword,
  adminUpdateUser,
  adminLockUser,
  adminUnlockUser,
} from "@/lib/adminUsers";
import FiltersBar from "./components/FiltersBar";
import UsersTable from "./components/UsersTable";
import UserDetailDrawer from "./components/UserDetailDrawer";
import ResetPasswordModal from "./components/ResetPasswordModal";
import ConfirmDialog from "./components/ConfirmDialog";

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    role: "all" as "all" | AdminUser["role"],
    vip: "all" as "all" | "true" | "false",
    blocked: "all" as "all" | "true" | "false",
    locked: "all" as "all" | "true" | "false",
  });

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    id: string;
    action: "block" | "unblock" | "logout" | "lock" | "unlock";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await adminListUsers({
        page: nextPage,
        limit: 20,
        q: filters.q || undefined,
        role: filters.role === "all" ? undefined : filters.role,
        vip: filters.vip === "all" ? undefined : filters.vip === "true",
        blocked:
          filters.blocked === "all" ? undefined : filters.blocked === "true",
        locked:
          filters.locked === "all" ? undefined : filters.locked === "true",
      });
      setData(res.items);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSaveUser = async (id: string, payload: Partial<AdminUser>) => {
    await adminUpdateUser(id, payload);
    await load(page);
  };

  const handleResetPassword = async (payload: {
    newPassword?: string;
    generateRandom?: boolean;
  }) => {
    if (!resetUserId) return;
    await adminResetPassword(resetUserId, payload);
    setResetUserId(null);
  };

  const handleConfirmAction = async () => {
    if (!confirm) return;
    if (confirm.action === "block") await adminBlockUser(confirm.id);
    if (confirm.action === "unblock") await adminUnblockUser(confirm.id);
    if (confirm.action === "logout") await adminForceLogout(confirm.id);
    if (confirm.action === "lock") {
      // Default: 60 minutes lock
      await adminLockUser(confirm.id, { reason: "admin_lock", minutes: 60 });
    }
    if (confirm.action === "unlock") await adminUnlockUser(confirm.id);
    setConfirm(null);
    await load(page);
  };

  const tableData = useMemo(() => data, [data]);

  return (
    <AdminShell>
      <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          onRefresh={() => load(page)}
          page={page}
          totalPages={totalPages}
          onPageChange={load}
        />

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <UsersTable
          users={tableData}
          loading={loading}
          onSelect={setSelected}
          onBlock={(u) => setConfirm({ id: u._id, action: "block" })}
          onUnblock={(u) => setConfirm({ id: u._id, action: "unblock" })}
          onLock={(u) => setConfirm({ id: u._id, action: "lock" })}
          onUnlock={(u) => setConfirm({ id: u._id, action: "unlock" })}
          onForceLogout={(u) => setConfirm({ id: u._id, action: "logout" })}
          onResetPassword={(u) => setResetUserId(u._id)}
        />

        <UserDetailDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onSave={handleSaveUser}
          onUserUpdated={(u) => {
            setSelected(u);
            // refresh list to reflect new VIP expiration immediately
            load(page);
          }}
        />

        <ResetPasswordModal
          userId={resetUserId}
          onClose={() => setResetUserId(null)}
          onSubmit={handleResetPassword}
        />

        <ConfirmDialog
          open={!!confirm}
          title={
            confirm?.action === "logout"
              ? "Force logout this user?"
              : confirm?.action === "block"
              ? "Block this user?"
              : confirm?.action === "unblock"
              ? "Unblock this user?"
              : confirm?.action === "lock"
              ? "Lock this user for 60 minutes?"
              : "Unlock this user?"
          }
          description="This action is immediate and will be audited."
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirmAction}
        />
      </div>
    </AdminShell>
  );
}
