/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import {
  adminCreateUser,
  adminExtendVip,
  adminGetTrialSettings,
  adminGetUsers,
  adminUpdateTrialSettings,
  adminUpdateUser,
  adminUnlockUser,
  TrialSettings,
  User,
  UserRole,
} from "@/lib/api";

import TrialSettingsCard from "./components/TrialSettingsCard";
import UsersTable from "./components/UsersTable";
import CreateUserModal from "./components/CreateUserModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as UserRole,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vipMonths, setVipMonths] = useState<Record<string, number>>({});

  // ✅ Trial settings
  const [trial, setTrial] = useState<TrialSettings | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  async function loadUsers() {
    try {
      setLoading(true);
      const roleParam = roleFilter === "all" ? undefined : roleFilter;
      const data = await adminGetUsers(search || undefined, roleParam);
      setUsers(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function loadTrial() {
    try {
      setTrialLoading(true);
      const data = await adminGetTrialSettings();
      setTrial(data);
      setTrialError(null);
    } catch (e: any) {
      setTrialError(
        e?.response?.data?.message || "Failed to load trial settings"
      );
    } finally {
      setTrialLoading(false);
    }
  }

  const handleSaveTrial = async () => {
    if (!trial) return;
    try {
      setTrialSaving(true);
      const updated = await adminUpdateTrialSettings({
        enabled: trial.enabled,
        days: trial.days,
      });
      setTrial(updated);
      setTrialError(null);
    } catch (e: any) {
      setTrialError(e?.response?.data?.message || "Failed to update trial");
    } finally {
      setTrialSaving(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadTrial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const filteredBySearch = useMemo(() => {
    return users.filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminCreateUser(createForm);
      setCreateForm({ username: "", email: "", password: "", role: "user" });
      setCreating(false);
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await adminUpdateUser(user._id, { isActive: !user.isActive });
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to update user");
    }
  };

  const handleRoleChange = async (user: User, newRole: UserRole) => {
    try {
      await adminUpdateUser(user._id, { role: newRole });
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to update role");
    }
  };

  const handleExtendVipClick = async (user: User) => {
    try {
      const months = vipMonths[user._id] ?? 1;
      await adminExtendVip(user._id, months);
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to extend VIP");
    }
  };

  const handleUnlock = async (user: User) => {
    try {
      await adminUnlockUser(user._id);
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to unlock user");
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Top controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500/60"
                placeholder="Search by username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              />
            </div>

            <select
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500/60"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
            >
              <option value="all">All roles</option>
              <option value="user">User</option>
              <option value="translator">Translator</option>
              <option value="admin">Admin</option>
            </select>

            <button
              onClick={loadUsers}
              className="md:hidden inline-flex items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition"
            >
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadUsers();
                loadTrial();
              }}
              className="hidden md:inline-flex items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition"
            >
              Refresh
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 hover:brightness-110 transition"
            >
              + New user
            </button>
          </div>
        </div>

        {/* Trial settings */}
        <TrialSettingsCard
          trial={trial}
          trialLoading={trialLoading}
          trialSaving={trialSaving}
          trialError={trialError}
          onRefresh={loadTrial}
          onSave={handleSaveTrial}
          onChange={setTrial}
        />

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Users table */}
        <UsersTable
          users={filteredBySearch}
          loading={loading}
          vipMonths={vipMonths}
          onVipMonthsChange={(id, months) =>
            setVipMonths((prev) => ({ ...prev, [id]: months }))
          }
          onToggleActive={handleToggleActive}
          onRoleChange={handleRoleChange}
          onExtendVip={handleExtendVipClick}
          onUnlock={handleUnlock}
        />

        {/* Create modal */}
        <CreateUserModal
          open={creating}
          saving={saving}
          form={createForm}
          onClose={() => setCreating(false)}
          onChange={setCreateForm}
          onSubmit={handleCreate}
        />
      </div>
    </AdminShell>
  );
}
