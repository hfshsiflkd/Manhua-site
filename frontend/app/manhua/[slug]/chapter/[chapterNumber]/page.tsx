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

  const [user, setUser] = useState<UserMe | null | undefined>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [vipGateFromApi, setVipGateFromApi] = useState(false);

  const canRead = user?.isVIP === true;
  const showVipGate = !canRead || vipGateFromApi;

  useEffect(() => {
    Promise.all([
      api
        .get<UserMe>("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => setUser(null)),
      api
        .get<Chapter>(`/manhuas/${slug}/chapters/${chapterNumber}`)
        .then((r) => setChapter(r.data))
        .catch((err) => {
          if (err?.response?.status === 403) setVipGateFromApi(true);
          setChapter(null);
        }),
    ]).finally(() => setLoading(false));
  }, [slug, chapterNumber]);

  useEffect(() => {
    document.body.style.overflow = showVipGate ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showVipGate]);

  if (loading) return <LoadingState />;
  if (user === null)
    return <LoginRequired onLogin={() => router.push("/login")} />;
  if (!chapter && !vipGateFromApi)
    return <ChapterNotFound onBack={() => router.back()} />;

  return (
    <div className="w-full">
      <VipTrialReminder
        isVIP={user?.isVIP}
        vipExpiresAt={user?.vipExpiresAt ?? null}
      />

      {chapter && (
        <ChapterHeader
          slug={slug}
          chapter={chapter}
          onBack={() => router.back()}
        />
      )}

      {chapter && (
        <ChapterNav
          slug={slug}
          chapterNumber={chapter.chapterNumber}
          hasPrev={chapter.hasPrev}
          hasNext={chapter.hasNext}
        />
      )}

      <div className="relative">
        {chapter && !showVipGate && <ChapterPages chapter={chapter} />}

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
