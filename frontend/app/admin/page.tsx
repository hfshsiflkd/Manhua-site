/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api, adminGetManhuas, Manhua } from "@/lib/api";
import { useRouter } from "next/navigation";
import AdminShell from "./components/AdminShell";
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
      stats={stats ? { totalManhuas: stats.totalManhuas, totalUsers: stats.totalUsers, totalVIP: stats.totalVIP } : undefined}
    >
      {loadingStats && !stats ? (
        <div className="flex min-h-[60vh] items-center justify-center text-[13px]" style={{ color: "var(--arc-muted)" }}>
          Admin dashboard ачаалж байна...
        </div>
      ) : !stats ? (
        <div className="flex min-h-[60vh] items-center justify-center text-[13px]" style={{ color: "var(--arc-rose)" }}>
          Статистик ачаалж чадсангүй.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Page heading */}
          <div style={{ marginBottom: 4 }}>
            <h1 style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", color: "#fff", marginBottom: 3 }}>
              Admin dashboard
            </h1>
            <p style={{ fontSize: 13, color: "var(--arc-muted)" }}>Системийн ерөнхий статистик, хурдан линк, сүүлийн манхуа.</p>
          </div>

          <AdminStatsCards stats={stats} />
          <AdminQuickLinks />

          {/* Bottom grid: table + (future activity feed) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            <AdminRecentManhuas manhuas={manhuas.slice(0, 8)} loading={loadingManhuas} />
          </div>
        </div>
      )}
    </AdminShell>
  );
}
