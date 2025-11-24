/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import {
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminExtendVip,
  User,
  UserRole,
} from "@/lib/api";

const roleLabel: Record<UserRole, string> = {
  user: "User",
  translator: "Translator",
  admin: "Admin",
};

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

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

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

  const filteredBySearch = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  function formatVipStatus(user: User) {
    if (!user.vipExpiresAt) {
      return { label: "No VIP", state: "none" as const };
    }

    const now = new Date();
    const vipDate = new Date(user.vipExpiresAt);
    if (vipDate < now) {
      return {
        label: `Expired (${vipDate.toLocaleDateString()})`,
        state: "expired" as const,
      };
    }

    const diffMs = vipDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      label: `Active (${vipDate.toLocaleDateString()} • ${diffDays} day${
        diffDays !== 1 ? "s" : ""
      } left)`,
      state: diffDays <= 7 ? ("soon" as const) : ("active" as const),
    };
  }

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
              onClick={loadUsers}
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

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Users table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur shadow-xl shadow-black/40">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/90 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                    VIP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 hidden md:table-cell">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-400 text-sm"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredBySearch.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-500 text-sm"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredBySearch.map((user) => {
                    const vip = formatVipStatus(user);

                    return (
                      <tr
                        key={user._id}
                        className="border-t border-slate-800/80 hover:bg-slate-900/70 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-100">
                              {user.username}
                            </span>
                            <span className="text-xs text-slate-400">
                              {user.email}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            className="rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user, e.target.value as UserRole)
                            }
                          >
                            <option value="user">User</option>
                            <option value="translator">Translator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition ${
                              user.isActive
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                                : "border-slate-600 bg-slate-800 text-slate-300"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                            {user.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border " +
                              (vip.state === "none"
                                ? "border-slate-600 bg-slate-900 text-slate-300"
                                : vip.state === "expired"
                                ? "border-red-500/60 bg-red-500/10 text-red-200"
                                : vip.state === "soon"
                                ? "border-amber-400/70 bg-amber-500/10 text-amber-200"
                                : "border-emerald-500/60 bg-emerald-500/10 text-emerald-200")
                            }
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                            {vip.label}
                          </span>
                        </td>

                        <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              className="rounded-full border border-amber-400/50 bg-slate-900/80 px-2 py-1 text-[11px] text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60"
                              value={vipMonths[user._id] ?? 1}
                              onChange={(e) =>
                                setVipMonths((prev) => ({
                                  ...prev,
                                  [user._id]: Number(e.target.value),
                                }))
                              }
                            >
                              <option value={1}>+1 month</option>
                              <option value={3}>+3 months</option>
                              <option value={6}>+6 months</option>
                              <option value={12}>+12 months</option>
                            </select>

                            <button
                              onClick={() => handleExtendVipClick(user)}
                              className="rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-500/20 transition"
                            >
                              Extend VIP
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create user modal */}
        {creating && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Create new user</h2>
                <button
                  onClick={() => setCreating(false)}
                  className="text-slate-400 hover:text-slate-100 text-sm"
                >
                  ✕
                </button>
              </div>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">
                    Username<span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        username: e.target.value,
                      }))
                    }
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
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
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
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        password: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Role</label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        role: e.target.value as UserRole,
                      }))
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
                    onClick={() => setCreating(false)}
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
        )}
      </div>
    </AdminShell>
  );
}
