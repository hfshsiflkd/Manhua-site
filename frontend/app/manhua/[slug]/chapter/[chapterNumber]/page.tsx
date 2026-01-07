/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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

  const slug = params.slug as string;
  const chapterNumber = Number(params.chapterNumber as string);

  const [user, setUser] = useState<UserMe | null | undefined>(undefined);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [vipGateFromApi, setVipGateFromApi] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [loadedPagesCount, setLoadedPagesCount] = useState(0);
  const [totalPagesCount, setTotalPagesCount] = useState(0);

  const canRead = user?.isVIP === true;
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
        // 1) эхлээд ME
        let me: UserMe | null = null;
        try {
          const r = await api.get("/auth/me", {
            headers: { "Cache-Control": "no-store" }, // bonus
          });
          // Backend returns { success: true, user: {...} }
          me = r.data?.user || r.data;
        } catch (err: any) {
          console.error("Failed to fetch user:", err);
          me = null;
        }

        if (cancelled) return;
        setUser(me);

        // login шаардах бол chapter авахгүй
        if (me === null) {
          setLoading(false);
          return;
        }

        // 2) дараа нь chapter (VIP state тодорхой болсон үед)
        try {
          const r2 = await api.get<Chapter>(
            `/manhuas/${slug}/chapters/${chapterNumber}`,
            { headers: { "Cache-Control": "no-store" } } // bonus
          );
          if (cancelled) return;

          setChapter(r2.data);

          // Set total pages count
          const pages = Array.isArray(r2.data?.pages) ? r2.data.pages : [];
          setTotalPagesCount(pages.length);
          setImagesLoading(pages.length > 0);

          // Mark chapter as read when successfully loaded
          if (r2.data && r2.data.chapterNumber) {
            markChapterAsRead(slug, r2.data.chapterNumber);
          }

          // VIP мөртлөө pages байхгүй бол backend дээр VIP танигдахгүй байна гэсэн дохио
          if (me.isVIP && !("pages" in (r2.data as any))) {
            // энэ тохиолдолд gate-аа заавал асаахгүй, харин backend-ээ засах хэрэгтэй гэдгийг илтгэнэ
            // хүсвэл энд console.warn хийж болно
          }
        } catch (err: any) {
          if (cancelled) return;
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
      <VipTrialReminder
        isVIP={user?.isVIP}
        vipExpiresAt={user?.vipExpiresAt ?? null}
      />

      {/* Always show header, even when loading */}
      <ChapterHeader
        slug={slug}
        chapter={chapter}
        onBack={() => router.back()}
        isLoading={showSpinner}
        loadedCount={loadedPagesCount}
        totalPages={totalPagesCount}
      />

      {chapter && (
        <ChapterNav
          slug={slug}
          chapterNumber={chapter.chapterNumber}
          hasPrev={chapter.hasPrev}
          hasNext={chapter.hasNext}
        />
      )}

      <div className="relative">
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
        />
      )}
    </div>
  );
}
