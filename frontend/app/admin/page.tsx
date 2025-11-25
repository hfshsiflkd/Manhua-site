/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api, adminGetManhuas, Manhua } from "@/lib/api";
import { useRouter } from "next/navigation";
import AdminShell from "./components/AdminShell";
import AdminHeader from "./components/AdminHeader";
import AdminStatsCards from "./components/AdminStatsCards";
import AdminQuickLinks from "./components/AdminQuickLinks";
import AdminRecentManhuas from "./components/AdminRecentManhuas";

interface AdminStats {
  totalUsers: number;
  totalVIP: number;
  totalManhuas: number;
  totalChapters: number;
  views?: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingManhuas, setLoadingManhuas] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, manhuasData] = await Promise.all([
          api.get<AdminStats>("/admin/stats"),
          adminGetManhuas(),
        ]);

        setStats(statsRes.data);
        setManhuas(Array.isArray(manhuasData) ? manhuasData : []);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          router.push("/admin/login");
        } else {
          console.error(err);
        }
      } finally {
        setLoadingStats(false);
        setLoadingManhuas(false);
      }
    }

    load();
  }, [router]);

  return (
    <AdminShell
      title="Admin dashboard"
      subtitle="Систэмийн ерөнхий статистик, хурдан линк, сүүлийн манхуа."
    >
      {loadingStats && !stats ? (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
          Admin dashboard ачаалж байна...
        </div>
      ) : !stats ? (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-400">
          Статистик ачаалж чадсангүй.
        </div>
      ) : (
        <div className="space-y-6">
          <AdminHeader statsLoaded={!loadingStats} />
          <AdminStatsCards stats={stats} />
          <AdminQuickLinks />
          <AdminRecentManhuas manhuas={manhuas} loading={loadingManhuas} />
        </div>
      )}
    </AdminShell>
  );
}
