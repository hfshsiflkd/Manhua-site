/* eslint-disable @typescript-eslint/no-explicit-any */
// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { HomePageHeader } from "./components/HomePage/HomePageHeader";
import PopularToday from "./components/HomePage/PopularToday";
import LatestUpdates from "./components/HomePage/LatestUpdates";
import { api } from "@/lib/api";
import {ManhuaDetailLoading} from "@/components/ui/Loading";

type HomeData = {
  hero: any[];
  popularToday: any[];
  latestUpdates: any[];
};

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const res = await api.get("/manhuas/home/sections");
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
      <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <ManhuaDetailLoading/>
      </div>
    );
  }

  // ERROR UI
  if (error || !data) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Алдаа гарлаа</h1>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => location.reload()}
            className="mt-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Дахин ачаалах
          </button>
        </div>
      </div>
    );
  }

  // NORMAL UI
  return (
    <div className="m-0 min-h-screen w-screen overflow-x-hidden bg-slate-950 text-white">
      <HomePageHeader slides={data.hero} />
      <PopularToday popular={data.popularToday} />
      <LatestUpdates updates={data.latestUpdates} />
    </div>
  );
}
