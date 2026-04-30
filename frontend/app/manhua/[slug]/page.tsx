/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getPublicChapters } from "@/lib/api";
import type { Manhua, Chapter } from "@/types/manhua";
import { ManhuaHero } from "./components/ManhuaHero";
import { ManhuaChapters } from "./components/ManhuaChapters";

function ManhuaDetailLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none"
          style={{ animation: "spin 0.9s linear infinite" }}>
          <circle cx="22" cy="22" r="18" stroke="var(--arc-border)" strokeWidth="3" />
          <circle cx="22" cy="22" r="18" stroke="var(--arc-cyan)" strokeWidth="3"
            strokeLinecap="round" strokeDasharray="28 84" strokeDashoffset="0" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
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
          getPublicChapters(slug),
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

  if (loading) return <ManhuaDetailLoading />;

  if (!manhua) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-[12px] px-4 py-3 text-[13px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          Манхуа олдсонгүй.
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-5xl sm:px-4 space-y-4 sm:pt-6 pb-12">
        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 text-[12px] min-w-0" style={{ color: "var(--arc-muted)" }}>
          <Link href="/" className="transition-colors shrink-0" style={{ color: "var(--arc-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-muted)")}
          >
            Нүүр
          </Link>
          <span className="shrink-0" style={{ opacity: 0.4 }}>›</span>
          <Link href="/manhuas" className="transition-colors shrink-0" style={{ color: "var(--arc-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-muted)")}
          >
            Жагсаалт
          </Link>
          <span className="shrink-0" style={{ opacity: 0.4 }}>›</span>
          <span className="truncate min-w-0" style={{ color: "var(--arc-text)" }}>{manhua.title}</span>
        </div>

        <ManhuaHero manhua={manhua} chapters={chapters} />
        <ManhuaChapters slug={manhua.slug} chapters={chapters} manhua={manhua} />
      </div>
    </div>
  );
}
