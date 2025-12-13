/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { User, UserRole } from "@/lib/api";

type Props = {
  users: User[];
  loading: boolean;
  vipMonths: Record<string, number>;
  onVipMonthsChange: (userId: string, months: number) => void;
  onToggleActive: (user: User) => void;
  onRoleChange: (user: User, newRole: UserRole) => void;
  onExtendVip: (user: User) => void;

  // ✅ lock/unlock
  onUnlock: (user: User) => void;
};

const roleLabel: Record<UserRole, string> = {
  user: "User",
  translator: "Translator",
  admin: "Admin",
};

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

function formatLockStatus(user: any) {
  const until = user.lockUntil ? new Date(user.lockUntil) : null;
  const now = new Date();
  if (!until) return { locked: false, label: "—" };

  if (until.getTime() <= now.getTime()) {
    return { locked: false, label: "—" };
  }

  const diffMs = until.getTime() - now.getTime();
  const diffMin = Math.ceil(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;

  const left = diffHr > 0 ? `${diffHr}h ${remMin}m left` : `${diffMin}m left`;

  return {
    locked: true,
    label: `Locked (${until.toLocaleString()} • ${left})`,
  };
}

export default function UsersTable({
  users,
  loading,
  vipMonths,
  onVipMonthsChange,
  onToggleActive,
  onRoleChange,
  onExtendVip,
  onUnlock,
}: Props) {
  return (
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

              {/* ✅ new: Lock */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 hidden lg:table-cell">
                Lock
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
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400 text-sm"
                >
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500 text-sm"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const vip = formatVipStatus(user);
                const lock = formatLockStatus(user);

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

                        {/* ✅ mobile дээр lock-ийг энд жижиг харуулж болно */}
                        {lock.locked && (
                          <span className="mt-1 inline-flex w-fit items-center rounded-full border border-rose-500/60 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200 lg:hidden">
                            {lock.label}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                        value={user.role}
                        onChange={(e) =>
                          onRoleChange(user, e.target.value as UserRole)
                        }
                      >
                        <option value="user">{roleLabel.user}</option>
                        <option value="translator">
                          {roleLabel.translator}
                        </option>
                        <option value="admin">{roleLabel.admin}</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => onToggleActive(user)}
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

                    {/* ✅ Lock column */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lock.locked ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-rose-500/60 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                            {lock.label}
                          </span>

                          <button
                            onClick={() => onUnlock(user)}
                            className="rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20 transition"
                          >
                            Unlock
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
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
                            onVipMonthsChange(user._id, Number(e.target.value))
                          }
                        >
                          <option value={1}>+1 month</option>
                          <option value={3}>+3 months</option>
                          <option value={6}>+6 months</option>
                          <option value={12}>+12 months</option>
                        </select>

                        <button
                          onClick={() => onExtendVip(user)}
                          className="rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-500/20 transition"
                        >
                          Extend VIP
                        </button>
                      </div>

                      {/* ✅ mobile дээр unlock товчийг доор нь гаргаж болно */}
                      {lock.locked && (
                        <div className="mt-2 flex justify-end lg:hidden">
                          <button
                            onClick={() => onUnlock(user)}
                            className="rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20 transition"
                          >
                            Unlock
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
