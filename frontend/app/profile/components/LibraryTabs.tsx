"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { isChapterRead } from "@/lib/useReadState";
import type { Favorite, Bookmark } from "@/lib/api";

interface LibraryTabsProps {
  favorites: Favorite[];
  bookmarks: Bookmark[];
  recentlyRead: Array<{
    manhuaSlug: string;
    chapterNumber: number;
    manhuaTitle: string;
    coverImageUrl?: string;
  }>;
}

type Tab = "favorites" | "bookmarks" | "recent";

export function LibraryTabs({
  favorites,
  bookmarks,
  recentlyRead,
}: LibraryTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("favorites");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "favorites", label: "Дуртай", count: favorites.length },
    { id: "bookmarks", label: "Хавтас", count: bookmarks.length },
    { id: "recent", label: "Сүүлд уншсан", count: recentlyRead.length },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "favorites":
        return <FavoritesList favorites={favorites} />;
      case "bookmarks":
        return <BookmarksList bookmarks={bookmarks} />;
      case "recent":
        return <RecentlyReadList items={recentlyRead} />;
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/25 to-yellow-400/15 p-[1px] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-2 rounded-full bg-slate-950/70 p-1 shadow-inner shadow-black/40">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div>{renderContent()}</div>
      </div>
    </div>
  );
}

function FavoritesList({ favorites }: { favorites: Favorite[] }) {
  if (favorites.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-slate-500">Дуртай манхуа алга</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {favorites.map((fav) => {
        const cover = fav.manhua.coverImageUrl || fav.manhua.coverImage;
        return (
          <Link
            key={fav._id}
            href={`/manhua/${fav.manhua.slug}`}
            className="flex gap-3 rounded-xl border border-transparent bg-slate-900/40 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-cyan-500/20 hover:bg-slate-900/80"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-slate-700 ring-1 ring-slate-700/60 shadow-md shadow-black/40">
              {cover ? (
                <Image
                  src={cover}
                  alt={fav.manhua.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                  No cover
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-2 text-sm font-semibold text-slate-100">
                {fav.manhua.title}
              </h4>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function BookmarksList({ bookmarks }: { bookmarks: Bookmark[] }) {
  if (bookmarks.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-slate-500">Хавтас алга</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((bookmark) => {
        const cover =
          bookmark.manhua.coverImageUrl || bookmark.manhua.coverImage;
        const isRead = isChapterRead(
          bookmark.manhua.slug,
          bookmark.chapterNumber
        );

        return (
          <Link
            key={bookmark._id}
            href={`/manhua/${bookmark.manhua.slug}/chapter/${bookmark.chapterNumber}`}
            className="flex gap-3 rounded-xl border border-transparent bg-slate-900/40 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-cyan-500/20 hover:bg-slate-900/80"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-slate-700 ring-1 ring-slate-700/60 shadow-md shadow-black/40">
              {cover ? (
                <Image
                  src={cover}
                  alt={bookmark.manhua.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                  No cover
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-1 text-sm font-semibold text-slate-100">
                {bookmark.manhua.title}
              </h4>
              <p
                className={`mt-1 text-xs ${
                  isRead
                    ? "text-gray-500 font-normal"
                    : "text-gray-300 font-medium"
                }`}
              >
                Chapter {bookmark.chapterNumber}
                {isRead && (
                  <span className="ml-1 text-gray-600">(уншсан)</span>
                )}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function RecentlyReadList({
  items,
}: {
  items: Array<{
    manhuaSlug: string;
    chapterNumber: number;
    manhuaTitle: string;
    coverImageUrl?: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-slate-500">Сүүлд уншсан манхуа алга</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isRead = isChapterRead(item.manhuaSlug, item.chapterNumber);
        return (
          <Link
            key={`${item.manhuaSlug}-${item.chapterNumber}-${idx}`}
            href={`/manhua/${item.manhuaSlug}/chapter/${item.chapterNumber}`}
            className="flex gap-3 rounded-xl border border-transparent bg-slate-900/40 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-cyan-500/20 hover:bg-slate-900/80"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-slate-700 ring-1 ring-slate-700/60 shadow-md shadow-black/40">
              {item.coverImageUrl ? (
                <Image
                  src={item.coverImageUrl}
                  alt={item.manhuaTitle}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                  No cover
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-1 text-sm font-semibold text-slate-100">
                {item.manhuaTitle}
              </h4>
              <p
                className={`mt-1 text-xs ${
                  isRead
                    ? "text-gray-500 font-normal"
                    : "text-gray-300 font-medium"
                }`}
              >
                Chapter {item.chapterNumber}
                {isRead && (
                  <span className="ml-1 text-gray-600">(уншсан)</span>
                )}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

