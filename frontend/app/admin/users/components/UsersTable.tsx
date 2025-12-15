"use client";

import { AdminUser } from "@/lib/adminUsers";

function vipLabel(user: AdminUser) {
  if (!user.vipExpiresAt) return "No VIP";
  const exp = new Date(user.vipExpiresAt);
  return exp > new Date()
    ? `VIP until ${exp.toLocaleDateString()}`
    : "VIP expired";
}

function lockLabel(user: AdminUser) {
  if (!user.lockUntil) return { locked: false, label: "—" };
  const lockDate = new Date(user.lockUntil);
  const now = new Date();
  if (lockDate <= now) return { locked: false, label: "—" };

  const diffMs = lockDate.getTime() - now.getTime();
  const diffMin = Math.ceil(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  const left = diffHr > 0 ? `${diffHr}h ${remMin}m` : `${diffMin}m`;

  return {
    locked: true,
    label: `${user.lockReason || "Locked"} (${left} left)`,
    until: lockDate,
  };
}

export default function UsersTable({
  users,
  loading,
  onSelect,
  onBlock,
  onUnblock,
  onLock,
  onUnlock,
  onForceLogout,
  onResetPassword,
}: {
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
  // Mobile card view
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400 text-sm">
        Loading users...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-500 text-sm">
        No users found
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {users.map((user) => {
          const lock = lockLabel(user);
          return (
            <div
              key={user._id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onSelect(user)}
                    className="text-left text-sm font-semibold text-slate-100 hover:underline truncate block w-full"
                  >
                    {user.username}
                  </button>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                  {user.phone && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {user.phone}
                    </p>
                  )}
                </div>
                <span className="text-xs rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-200 ml-2 flex-shrink-0">
                  {user.role}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    user.blocked
                      ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {user.blocked ? "Blocked" : "Active"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {vipLabel(user)}
                </span>
                {lock.locked && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                    🔒 {lock.label}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => onSelect(user)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
                >
                  View
                </button>
                <button
                  onClick={() => onResetPassword(user)}
                  className="flex-1 rounded-lg border border-amber-500/70 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 hover:bg-amber-500/20"
                >
                  Reset PW
                </button>
                {lock.locked ? (
                  <button
                    onClick={() => onUnlock(user)}
                    className="flex-1 rounded-lg border border-rose-500/70 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 hover:bg-rose-500/20"
                  >
                    Unlock
                  </button>
                ) : (
                  <button
                    onClick={() => onLock(user)}
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    Lock
                  </button>
                )}
                {user.blocked ? (
                  <button
                    onClick={() => onUnblock(user)}
                    className="flex-1 rounded-lg border border-emerald-500/70 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-500/20"
                  >
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => onBlock(user)}
                    className="flex-1 rounded-lg border border-rose-500/70 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 hover:bg-rose-500/20"
                  >
                    Block
                  </button>
                )}
                <button
                  onClick={() => onForceLogout(user)}
                  className="flex-1 rounded-lg border border-cyan-500/70 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/20"
                >
                  Logout
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur shadow-xl shadow-black/40">
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
                  VIP
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Blocked
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Locked
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
              {users.map((user) => {
                const lock = lockLabel(user);
                return (
                  <tr
                    key={user._id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/70 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <button
                          className="text-left text-sm font-semibold text-slate-100 hover:underline"
                          onClick={() => onSelect(user)}
                        >
                          {user.username}
                        </button>
                        <span className="text-xs text-slate-400">
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="text-[11px] text-slate-500">
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-200">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-300">
                        {vipLabel(user)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.blocked ? (
                        <span className="text-xs text-rose-300">Blocked</span>
                      ) : (
                        <span className="text-xs text-emerald-300">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lock.locked ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rose-300">
                            {lock.label}
                          </span>
                          <button
                            onClick={() => onUnlock(user)}
                            className="rounded-full border border-rose-500/60 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-500/20"
                          >
                            Unlock
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">—</span>
                          <button
                            onClick={() => onLock(user)}
                            className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                          >
                            Lock
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                        <button
                          onClick={() => onSelect(user)}
                          className="rounded-full border border-slate-700 px-3 py-1 text-slate-100 hover:bg-slate-800"
                        >
                          View / Edit
                        </button>
                        <button
                          onClick={() => onResetPassword(user)}
                          className="rounded-full border border-amber-500/70 text-amber-100 px-3 py-1 hover:bg-amber-500/10"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => onForceLogout(user)}
                          className="rounded-full border border-cyan-500/70 text-cyan-100 px-3 py-1 hover:bg-cyan-500/10"
                        >
                          Force logout
                        </button>
                        {user.blocked ? (
                          <button
                            onClick={() => onUnblock(user)}
                            className="rounded-full border border-emerald-500/70 text-emerald-100 px-3 py-1 hover:bg-emerald-500/10"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => onBlock(user)}
                            className="rounded-full border border-rose-500/70 text-rose-100 px-3 py-1 hover:bg-rose-500/10"
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
    </>
  );
}
