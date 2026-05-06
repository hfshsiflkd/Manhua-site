/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api, getPublicFreeReadMode } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { ChapterNav } from "../components/ChapterNav";
import VipGateOverlay from "@/app/components/VipGateOverlay";
import VipTrialReminder from "@/app/components/VipTrialReminder";

import ChapterPages, { Chapter } from "./components/ChapterPages";
import ChapterHeader from "./components/ChapterHeader";
import LoadingState from "./components/LoadingState";
import LoginRequired from "./components/LoginRequired";
import ChapterNotFound from "./components/ChapterNotFound";
import { markChapterAsRead } from "@/lib/useReadState";

interface UserMe {
  _id: string;
  username: string;
  isVIP: boolean;
  vipExpiresAt?: string | null;
}

export default function ChapterReaderPage() {
  const params = useParams();
  const router = useRouter();

  // Hide global header/footer while in reader
  useEffect(() => {
    document.documentElement.setAttribute("data-reader", "true");
    return () => document.documentElement.removeAttribute("data-reader");
  }, []);

  const slug = params.slug as string;
  const chapterNumber = Number(params.chapterNumber as string);

  const [user, setUser] = useState<UserMe | null | undefined>(undefined);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [vipGateFromApi, setVipGateFromApi] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [loadedPagesCount, setLoadedPagesCount] = useState(0);
  const [totalPagesCount, setTotalPagesCount] = useState(0);
  const [freeReadActive, setFreeReadActive] = useState(false);

  const canRead = user?.isVIP === true || freeReadActive;
  const showVipGate = !canRead || vipGateFromApi;

  // ✅ slug/chapter солигдох бүрт локал state reset
  useEffect(() => {
    setLoading(true);
    setVipGateFromApi(false);
    setChapter(null);
    setImagesLoading(true);
    setLoadedPagesCount(0);
    setTotalPagesCount(0);
  }, [slug, chapterNumber]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Гурвыг зэрэг fetch — waterfall арилгана
        const [meResult, freeResult, chapterResult] = await Promise.allSettled([
          api.get("/auth/me"),
          getPublicFreeReadMode().catch(() => ({ active: false, expiresAt: null })),
          api.get<Chapter>(`/manhuas/${slug}/chapters/${chapterNumber}`),
        ]);

        if (cancelled) return;

        // Auth
        let me: UserMe | null = null;
        if (meResult.status === "fulfilled") {
          me = meResult.value.data?.user || meResult.value.data;
        }

        // Free read
        if (freeResult.status === "fulfilled") {
          setFreeReadActive((freeResult.value as { active: boolean }).active);
        }

        setUser(me);

        if (me === null) {
          setLoading(false);
          return;
        }

        // Chapter
        if (chapterResult.status === "fulfilled") {
          const data = chapterResult.value.data;
          setChapter(data);
          const pages = Array.isArray(data?.pages) ? data.pages : [];
          setTotalPagesCount(pages.length);
          setImagesLoading(pages.length > 0);
          if (Number.isFinite(data?.chapterNumber)) {
            markChapterAsRead(slug, data.chapterNumber);
          }
        } else {
          const err = chapterResult.reason as any;
          if (err?.response?.status === 403) setVipGateFromApi(true);
          setChapter(null);
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [slug, chapterNumber]);

  // ✅ Count a view ONLY after the user stayed 8+ seconds on the reader (and only once ever per user/device).
  useEffect(() => {
    if (!chapter?._id) return;
    if (showVipGate) return;
    if (loading) return;

    let stopped = false;
    let startToken: string | null = null;

    const timer = setTimeout(async () => {
      if (stopped) return;
      try {
        // Step 1: start token
        const startRes = await api.post<{ token: string }>(
          `/chapters/${chapter._id}/read/start`
        );
        startToken = startRes.data?.token;
        if (!startToken || stopped) return;

        // Step 2: confirm (server enforces >=8 seconds by token age)
        await api.post(`/chapters/${chapter._id}/read/confirm`, {
          token: startToken,
        });
      } catch {
        // ignore (dedupe, missing device id, etc.)
      }
    }, 8000);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [chapter?._id, showVipGate, loading]);

  // Track when images finish loading
  const handlePageLoad = () => {
    setLoadedPagesCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= totalPagesCount && totalPagesCount > 0) {
        setImagesLoading(false);
      }
      return newCount;
    });
  };

  useEffect(() => {
    document.body.style.overflow = showVipGate ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showVipGate]);

  // Show full loading state only when fetching initial data
  if (loading && !chapter) return <LoadingState />;
  if (user === null)
    return <LoginRequired onLogin={() => router.push("/login")} />;
  if (!chapter && !vipGateFromApi)
    return <ChapterNotFound onBack={() => router.back()} />;

  // Determine if we should show loading spinner (metadata loading OR images loading)
  const showSpinner = loading || imagesLoading;

  return (
    <div className="w-full">
      <VipTrialReminder />

      {/* Sticky topbar with prev/next + progress bar */}
      <ChapterHeader
        slug={slug}
        manhuaTitle={decodeURIComponent(slug).replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
        chapter={chapter}
        onBack={() => router.back()}
        onPrev={() => chapter?.hasPrev && chapterNumber > 1 && router.push(`/manhua/${slug}/chapter/${chapterNumber - 1}`)}
        onNext={() => chapter?.hasNext && router.push(`/manhua/${slug}/chapter/${chapterNumber + 1}`)}
        isLoading={showSpinner}
        loadedCount={loadedPagesCount}
        totalPages={totalPagesCount}
      />

      <div className="relative" style={{ paddingBottom: chapter ? 68 : 0 }}>
        {chapter && !showVipGate && (
          <ChapterPages
            chapter={chapter}
            onPageLoad={handlePageLoad}
          />
        )}

        {showVipGate && (
          <VipGateOverlay
            onGoVip={() => router.push("/vip")}
            onBack={() => router.back()}
          />
        )}
      </div>

      {chapter && (
        <ChapterNav
          slug={slug}
          chapterNumber={chapter.chapterNumber}
          hasPrev={chapter.hasPrev}
          hasNext={chapter.hasNext}
          totalPages={totalPagesCount}
        />
      )}
    </div>
  );
}
