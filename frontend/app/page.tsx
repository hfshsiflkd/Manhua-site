// app/page.tsx  — Server Component (no "use client")
import { HomePageHeader } from "./components/HomePage/HomePageHeader";
import PopularToday from "./components/HomePage/PopularToday";
import LatestUpdates from "./components/HomePage/LatestUpdates";
import TrialSurprise from "./components/TrialSurprise";
import VipTrialReminder from "./components/VipTrialReminder";

async function fetchHomeData() {
  const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    const res = await fetch(
      `${BASE}/manhuas/home/sections?latestUpdatesLimit=6`,
      { next: { revalidate: 60 } }   // 60 сек кэш — DB-д дахин дахин хандахгүй
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      hero: data.hero || [],
      popularToday: data.popularToday || [],
      latestUpdates: data.latestUpdates || [],
    };
  } catch (err) {
    console.error("[HomePage] fetch failed:", err);
    return { hero: [], popularToday: [], latestUpdates: [] };
  }
}

export default async function HomePage() {
  const data = await fetchHomeData();

  return (
    <div className="m-0 min-h-screen w-screen overflow-x-hidden" style={{ color: "var(--arc-text)" }}>
      <HomePageHeader slides={data.hero} />
      <VipTrialReminder />
      <PopularToday popular={data.popularToday} />
      <LatestUpdates updates={data.latestUpdates} limitDesktop={6} />
      <TrialSurprise />
    </div>
  );
}
