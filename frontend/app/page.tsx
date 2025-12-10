// app/page.tsx (server component)

import { HomePageHeader } from "./components/HomePage/HomePageHeader";
import PopularToday from "./components/HomePage/PopularToday";
import LatestUpdates from "./components/HomePage/LatestUpdates";
import { api } from "@/lib/api";

async function getHomeData() {
  const { data } = await api.get("/manhuas/home/sections");
  return data;
}

export default async function HomePage() {
  const data = await getHomeData();

  console.log("Home page data:", data);

  return (
    <div className="w-screen min-h-screen m-0 p-0  text-white">
      <HomePageHeader slides={data.hero} />
      <PopularToday popular={data.popularToday} />
      <LatestUpdates updates={data.latestUpdates} />
    </div>
  );
}
