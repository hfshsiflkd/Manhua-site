/* eslint-disable @typescript-eslint/no-explicit-any */
// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { HomePageHeader } from "./components/HomePage/HomePageHeader";
import PopularToday from "./components/HomePage/PopularToday";
import LatestUpdates from "./components/HomePage/LatestUpdates";
import { api } from "@/lib/api";
import { ManhuaDetailLoading } from "@/components/ui/Loading";
import TrialSurprise from "./components/TrialSurprise";
import VipTrialReminder from "./components/VipTrialReminder";
import { useAuth } from "@/context/AuthContext";

type HomeData = {
  hero: any[];
  popularToday: any[];
  latestUpdates: any[];
};

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchHome = async () => {
      try {
        // Request limited data for home preview
        const res = await api.get("/manhuas/home/sections", {
          params: { latestUpdatesLimit: 6 },
        });
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            "Эхлэл хуудасны өгөгдөл татахад алдаа гарлаа."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, []);

  // LOADING UI
  if (loading) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center text-white">
        <ManhuaDetailLoading />
      </div>
    );
  }

  // ERROR UI
  if (error || !data) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center px-4 text-center" style={{ color: "var(--arc-text)" }}>
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Алдаа гарлаа</h1>
          <p className="text-sm" style={{ color: "var(--arc-dim)" }}>{error}</p>
          <button
            onClick={() => location.reload()}
            className="mt-2 rounded-[9px] px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--arc-cyan)", color: "#07070e" }}
          >
            Дахин ачаалах
          </button>
        </div>
      </div>
    );
  }

  // NORMAL UI
  return (
    <div className="m-0 min-h-screen w-screen overflow-x-hidden" style={{ color: "var(--arc-text)" }}>
      <HomePageHeader slides={data.hero} />
      <VipTrialReminder isVIP={user?.isVIP} vipExpiresAt={user?.vipExpiresAt} />
      <PopularToday />
      <LatestUpdates updates={data.latestUpdates} limitDesktop={6} />
      <TrialSurprise />
    </div>
  );
}
