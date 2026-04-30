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

type Tab = "reading" | "favorites" | "bookmarks" | "settings";

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
  const [activeTab, setActiveTab] = useState<Tab>("reading");
  const toast = useToast();

  const lastReadBookmark = useMemo(() => {
    if (bookmarks.length === 0) return null;
    return [...bookmarks].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [bookmarks]);

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

      const manhuaMap = new Map<string, { chapterNumber: number; slug: string }>();
      entries.forEach(({ slug, chapterNumber }) => {
        const existing = manhuaMap.get(slug);
        if (!existing || chapterNumber > existing.chapterNumber) {
          manhuaMap.set(slug, { slug, chapterNumber });
        }
      });

      return Array.from(manhuaMap.values())
        .sort((a, b) => b.chapterNumber - a.chapterNumber)
        .slice(0, 10)
        .map(({ slug, chapterNumber }) => {
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
        const res = await api.get("/auth/me");
        const userData = res.data?.user || res.data;
        setMe(userData);

        const [favsData, bookmarksData] = await Promise.all([
          getMyFavorites().catch(() => [] as Favorite[]),
          getMyBookmarks().catch(() => [] as Bookmark[]),
        ]);

        setFavorites(favsData);
        setBookmarks(bookmarksData);

        if (bookmarksData.length > 0) {
          const mostRecent = [...bookmarksData].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          try {
            const chapters = await getPublicChapters(mostRecent.manhua.slug);
            setTotalChapters(chapters?.length || undefined);
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        const status = err?.response?.status;
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
      .then((data) => { if (active) setInvites(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setInvites([]); })
      .finally(() => { if (active) setLoadingInvites(false); });
    return () => { active = false; };
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      setWorkingInviteId(inviteId);
      await acceptMyTeamInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i._id !== inviteId));
      toast.success("Багийн хүсэлт зөвшөөрөгдлөө");
    } catch (err: any) {
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
      toast.error(err?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setWorkingInviteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[13px]" style={{ color: "var(--arc-muted)" }}>
        Профайл ачаалж байна...
      </div>
    );
  }

  if (!me && (errorStatus === 401 || errorStatus === 403)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-[13px]" style={{ color: "var(--arc-dim)" }}>Профайл харахын өмнө нэвтэрнэ үү 🔒</p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-[9px] px-4 py-2 text-[13px] font-semibold transition-all hover:brightness-110"
          style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
        >
          Нэвтрэх
        </button>
      </div>
    );
  }

  if (!me && errorStatus && errorStatus !== 401 && errorStatus !== 403) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
        <p className="text-[13px]" style={{ color: "oklch(0.75 0.18 15)" }}>Профайл ачаалах үед алдаа гарлаа (status {errorStatus}).</p>
        <button onClick={() => router.refresh()} className="text-[12px] underline-offset-2 hover:underline" style={{ color: "var(--arc-dim)", background: "none", border: "none", cursor: "pointer" }}>
          Дахин ачааллах
        </button>
      </div>
    );
  }

  if (!me) return null;

  const stats = {
    readCount: recentlyRead.length,
    favoriteCount: favorites.length,
    chapterCount: bookmarks.reduce((sum, b) => sum + b.chapterNumber, 0),
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Full-width hero with tabs */}
      <ProfileHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
      />

      {/* Content area */}
      <div
        className="mx-auto px-4 sm:px-6 py-7 pb-16 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6"
        style={{ maxWidth: 1100 }}
      >
        {/* Main column */}
        <div className="space-y-5">
          {/* Team invites */}
          {(loadingInvites || invites.length > 0) && (
            <section className="rounded-[14px] p-4 sm:p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)" }} />
                  <h2 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Team хүсэлтүүд</h2>
                </div>
                <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{invites.length}</span>
              </div>
              <div>
                {loadingInvites ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-[9px] animate-pulse" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex flex-col gap-2 rounded-[9px] px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between"
                        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
                      >
                        <div className="min-w-0">
                          <div className="font-medium" style={{ color: "var(--arc-text)" }}>{invite.team?.name || "Team"}</div>
                          <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Урьсан: {invite.invitedBy?.username || "—"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full px-2 py-1 text-[10px] uppercase font-semibold" style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.3)", color: "var(--arc-amber)" }}>pending</span>
                          <span className="rounded-full px-2 py-1 text-[10px] uppercase" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}>{invite.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleAcceptInvite(invite._id)} disabled={workingInviteId === invite._id}
                            className="rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                            style={{ background: "oklch(0.72 0.16 145)", color: "#07070e", border: "none", cursor: "pointer" }}>
                            Зөвшөөрөх
                          </button>
                          <button type="button" onClick={() => handleDeclineInvite(invite._id)} disabled={workingInviteId === invite._id}
                            className="rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60"
                            style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}>
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

          {/* Tab content */}
          {activeTab === "reading" && (
            <ContinueReading bookmark={lastReadBookmark || undefined} totalChapters={totalChapters} />
          )}

          {(activeTab === "favorites" || activeTab === "bookmarks") && (
            <LibraryTabs
              favorites={favorites}
              bookmarks={bookmarks}
              recentlyRead={recentlyRead}
              initialTab={activeTab === "favorites" ? "favorites" : "bookmarks"}
            />
          )}

          {activeTab === "settings" && <ProfileSettings />}
        </div>

        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:flex flex-col gap-4">
          <VipPurchase />
        </div>
      </div>
    </div>
  );
}
