/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin" | string;
  isVIP: boolean;
  vipExpiresAt?: string | null;
  createdAt?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [vipFilter, setVipFilter] = useState<"all" | "vip" | "non-vip">("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<AdminUser[]>("/admin/users");
        setUsers(res.data);
      } catch (err: any) {
        console.error(err);
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          router.push("/admin/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const extendVIP = async (userId: string, months: number) => {
    if (!months) return;

    try {
      setSavingId(userId);
      const res = await api.patch<AdminUser>(`/admin/users/${userId}/vip`, {
        months,
      });

      alert("VIP хугацааг амжилттай сунгалаа!");

      setUsers((prev) => prev.map((u) => (u._id === userId ? res.data : u)));
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "VIP эрх өөрчлөхөд алдаа гарлаа.");
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const text = (u.username + " " + u.email).toLowerCase();
      const s = search.toLowerCase();

      if (s && !text.includes(s)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (vipFilter === "vip" && !u.isVIP) return false;
      if (vipFilter === "non-vip" && u.isVIP) return false;

      return true;
    });
  }, [users, search, roleFilter, vipFilter]);

  const formatDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("mn-MN");
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Хэрэглэгчдийн жагсаалт ачаалж байна...
      </div>
    );
  }

  // 🟢 tbody-д орох мөрүүдийг НЭГ array болгож байна
  const rows = filteredUsers.length
    ? filteredUsers.map((u, index) => (
        <tr
          key={u._id || `user-${index}`}
          className="border-t border-slate-800 hover:bg-slate-800/60"
        >
          <td className="px-3 py-2 text-slate-100">{u.username}</td>
          <td className="px-3 py-2 text-slate-300">{u.email}</td>
          <td className="px-3 py-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                u.role === "admin"
                  ? "bg-rose-500/20 text-rose-200 border border-rose-400/40"
                  : "bg-slate-800 text-slate-200 border border-slate-600/60"
              }`}
            >
              {u.role}
            </span>
          </td>
          <td className="px-3 py-2">
            {u.isVIP ? (
              <span className="inline-flex items-center rounded-full bg-yellow-300/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
                VIP
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                Энгийн
              </span>
            )}
          </td>
          <td className="px-3 py-2 text-slate-300">
            {formatDate(u.vipExpiresAt)}
          </td>
          <td className="px-3 py-2 text-right">
            <select
              disabled={savingId === u._id}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!value) return;
                extendVIP(u._id, value);
                e.target.value = "";
              }}
              className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] outline-none focus:border-cyan-400"
            >
              {[
                { key: "default", value: "", label: "VIP сунгах" },
                { key: "1m", value: 1, label: "+ 1 сар" },
                { key: "3m", value: 3, label: "+ 3 сар" },
                { key: "6m", value: 6, label: "+ 6 сар" },
                { key: "12m", value: 12, label: "+ 12 сар" },
              ].map((opt) => (
                <option key={opt.key} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </td>
        </tr>
      ))
    : [
        <tr key="no-users">
          <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
            Тохирох хэрэглэгч олдсонгүй.
          </td>
        </tr>,
      ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent">
            Хэрэглэгчид
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Бүртгэлтэй бүх хэрэглэгч, VIP эрх, role-г нэг дор удирдах.
          </p>
        </div>

        <button
          onClick={() => router.push("/admin")}
          className="self-start rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
        >
          ← Admin dashboard
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Хэрэглэгчийн нэр эсвэл имэйлээр хайх..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 pr-3 text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as "all" | "user" | "admin")
            }
            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs outline-none focus:border-cyan-400"
          >
            <option value="all">Role: Бүгд</option>
            <option value="user">Зөвхөн user</option>
            <option value="admin">Зөвхөн admin</option>
          </select>

          <select
            value={vipFilter}
            onChange={(e) =>
              setVipFilter(e.target.value as "all" | "vip" | "non-vip")
            }
            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs outline-none focus:border-cyan-400"
          >
            <option value="all">VIP: Бүгд</option>
            <option value="vip">Зөвхөн VIP</option>
            <option value="non-vip">VIP биш</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900/90 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Username</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">VIP</th>
              <th className="px-3 py-2 text-left">Дуусах огноо</th>
              <th className="px-3 py-2 text-right">VIP сунгах</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}
