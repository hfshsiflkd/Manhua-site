/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, getMyFavorites, getMyBookmarks, type Favorite, type Bookmark } from "@/lib/api";
import { getPublicChapters } from "@/lib/api";
import { ProfileHeader } from "./components/ProfileHeader";
import { ContinueReading } from "./components/ContinueReading";
import { LibraryTabs } from "./components/LibraryTabs";
import { ProfileSettings } from "./components/ProfileSettings";
import { VipPurchase } from "./components/VipPurchase";

interface MeResponse {
  _id: string;
  username: string;
  email: string;
  isVIP: boolean;
  vipExpiresAt?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [totalChapters, setTotalChapters] = useState<number | undefined>(undefined);

  // Get last read chapter from bookmarks (most recent)
  const lastReadBookmark = useMemo(() => {
    if (bookmarks.length === 0) return null;
    // Sort by updatedAt descending, get the most recent
    const sorted = [...bookmarks].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted[0];
  }, [bookmarks]);

  // Get recently read from localStorage
  const recentlyRead = useMemo(() => {
    try {
      const stored = localStorage.getItem("readChapterIds");
      if (!stored) return [];

      const readChapters = JSON.parse(stored) as Record<string, boolean>;
      const entries = Object.entries(readChapters)
        .filter(([_, isRead]) => isRead)
        .map(([key]) => {
          const [slug, chapterStr] = key.split(":");
          const chapterNumber = parseInt(chapterStr, 10);
          if (!slug || isNaN(chapterNumber)) return null;
          return { slug, chapterNumber };
        })
        .filter((item): item is { slug: string; chapterNumber: number } => item !== null);

      // Get unique manhuas, keep the highest chapter number for each
      const manhuaMap = new Map<string, { chapterNumber: number; slug: string }>();
      entries.forEach(({ slug, chapterNumber }) => {
        const existing = manhuaMap.get(slug);
        if (!existing || chapterNumber > existing.chapterNumber) {
          manhuaMap.set(slug, { slug, chapterNumber });
        }
      });

      // Convert to array and find titles from favorites/bookmarks
      // Sort by chapter number descending to show most recent first
      return Array.from(manhuaMap.values())
        .sort((a, b) => b.chapterNumber - a.chapterNumber)
        .slice(0, 10) // Limit to 10 most recent
        .map(({ slug, chapterNumber }) => {
          // Try to find title from favorites or bookmarks
          const fav = favorites.find((f) => f.manhua.slug === slug);
          const bookmark = bookmarks.find((b) => b.manhua.slug === slug);
          const manhua = fav?.manhua || bookmark?.manhua;

          return {
            manhuaSlug: slug,
            chapterNumber,
            manhuaTitle: manhua?.title || slug,
            coverImageUrl: manhua?.coverImageUrl || manhua?.coverImage,
          };
        });
    } catch {
      return [];
    }
  }, [favorites, bookmarks]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);

        // Load user data
        const res = await api.get("/auth/me");
        const userData = res.data?.user || res.data;
        setMe(userData);

        // Load favorites and bookmarks in parallel
        const [favsData, bookmarksData] = await Promise.all([
          getMyFavorites().catch(() => [] as Favorite[]),
          getMyBookmarks().catch(() => [] as Bookmark[]),
        ]);

        setFavorites(favsData);
        setBookmarks(bookmarksData);

        // If we have a bookmark, get total chapters for progress calculation
        if (bookmarksData.length > 0) {
          const mostRecent = bookmarksData.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          try {
            const chapters = await getPublicChapters(mostRecent.manhua.slug);
            setTotalChapters(chapters?.length || undefined);
          } catch {
            // Ignore errors fetching chapters
          }
        }
      } catch (err: any) {
        const status = err?.response?.status;
        console.error("Failed to load profile:", err);
        setErrorStatus(status || 500);
        setMe(null);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Профайл ачаалж байна...
      </div>
    );
  }

  // Not logged in
  if (!me && (errorStatus === 401 || errorStatus === 403)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-100">
        <p className="text-sm">Профайл харахын өмнө нэвтэрнэ үү 🔒</p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Нэвтрэх
        </button>
      </div>
    );
  }

  // Other errors
  if (!me && errorStatus && errorStatus !== 401 && errorStatus !== 403) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-sm text-red-400">
        <p>Профайл ачаалах үед алдаа гарлаа (status {errorStatus}).</p>
        <button
          onClick={() => router.refresh()}
          className="text-[12px] text-slate-300 underline-offset-2 hover:underline"
        >
          Дахин ачааллах
        </button>
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="mx-auto max-w-md px-4 pb-12 pt-6">
      {/* Top Summary */}
      <ProfileHeader />

      {/* Reading Progress */}
      <ContinueReading bookmark={lastReadBookmark || undefined} totalChapters={totalChapters} />

      {/* Library Tabs */}
      <LibraryTabs
        favorites={favorites}
        bookmarks={bookmarks}
        recentlyRead={recentlyRead}
      />

      {/* VIP Purchase */}
      <VipPurchase />

      {/* Profile Settings */}
      <ProfileSettings />
    </div>
  );
}
