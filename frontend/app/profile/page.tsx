/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  getMyFavorites,
  getMyBookmarks,
  getMyTeamInvites,
  acceptMyTeamInvite,
  declineMyTeamInvite,
  type Favorite,
  type Bookmark,
  type TeamInvite,
} from "@/lib/api";
import { getPublicChapters } from "@/lib/api";
import { ProfileHeader } from "./components/ProfileHeader";
import { ContinueReading } from "./components/ContinueReading";
import { LibraryTabs } from "./components/LibraryTabs";
import { ProfileSettings } from "./components/ProfileSettings";
import { VipPurchase } from "./components/VipPurchase";
import { useToast } from "@/app/components/ToastProvider";

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
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [workingInviteId, setWorkingInviteId] = useState<string | null>(null);
  const toast = useToast();

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

  useEffect(() => {
    let active = true;
    setLoadingInvites(true);
    getMyTeamInvites()
      .then((data) => {
        if (!active) return;
        setInvites(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load invites:", err);
        setInvites([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingInvites(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      setWorkingInviteId(inviteId);
      await acceptMyTeamInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i._id !== inviteId));
      toast.success("Багийн хүсэлт зөвшөөрөгдлөө");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setWorkingInviteId(null);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      setWorkingInviteId(inviteId);
      await declineMyTeamInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i._id !== inviteId));
      toast.success("Хүсэлт татгалзлаа");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setWorkingInviteId(null);
    }
  };

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
    <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-8">
      <div className="pointer-events-none absolute inset-x-0 -top-12 -z-10 h-64 bg-gradient-to-b from-cyan-500/20 via-fuchsia-500/10 to-transparent blur-2xl" />
      <div className="pointer-events-none absolute -right-10 top-16 -z-10 h-40 w-40 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-10 -z-10 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="space-y-6">
        {/* Top Summary */}
        <ProfileHeader />

        {/* Team Invites */}
        {(loadingInvites || invites.length > 0) && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Team хүсэлтүүд</h2>
              <span className="text-xs text-slate-500">
                {invites.length}
              </span>
            </div>
            <div className="mt-3">
              {loadingInvites ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-xl border border-slate-800 bg-slate-950/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div
                      key={invite._id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100">
                          {invite.team?.name || "Team"}
                        </div>
                        <div className="text-xs text-slate-500">
                          Урьсан: {invite.invitedBy?.username || "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase text-amber-200">
                          pending
                        </span>
                        <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase text-slate-300">
                          {invite.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptInvite(invite._id)}
                          disabled={workingInviteId === invite._id}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                        >
                          Зөвшөөрөх
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineInvite(invite._id)}
                          disabled={workingInviteId === invite._id}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                        >
                          Татгалзах
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

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
    </div>
  );
}
