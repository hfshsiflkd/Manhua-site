/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/manhua/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getPublicChapters } from "@/lib/api";
import type { Manhua, Chapter } from "@/types/manhua";
import { ManhuaHero } from "./components/ManhuaHero";
import { ManhuaChapters } from "./components/ManhuaChapters";

// 🔹 Дэлгэрэнгүй хуудсын LOADING
function ManhuaDetailLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-white ">
      <div className="loader scale-125 text-white" />
    </div>
  );
}

export default function ManhuaDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [manhua, setManhua] = useState<Manhua | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        const [mRes, chaptersData] = await Promise.all([
          api.get<Manhua>(`/manhuas/${slug}`),
          getPublicChapters(slug), // ✅ зөвхөн PUBLIC эндпоинт
        ]);

        setManhua(mRes.data);
        setChapters(
          (chaptersData || []).sort((a, b) => b.chapterNumber - a.chapterNumber)
        );
      } catch (e: any) {
        console.error(e);
        if (e.response?.status === 404) {
          router.push("/");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug, router]);

  if (loading) {
    return <ManhuaDetailLoading />;
  }

  if (!manhua) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        Манхуа олдсонгүй.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ManhuaHero manhua={manhua} chapters={chapters} />
      <ManhuaChapters slug={manhua.slug} chapters={chapters} />
    </div>
  );
}
