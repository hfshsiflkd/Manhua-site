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
    <div className="pt-6 pb-4 border-b border-slate-800/50">
      {/* Tabs */}
      <div className="flex mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-cyan-500 text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div>{renderContent()}</div>
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
    <div className="space-y-1">
      {favorites.map((fav) => {
        const cover = fav.manhua.coverImageUrl || fav.manhua.coverImage;
        return (
          <Link
            key={fav._id}
            href={`/manhua/${fav.manhua.slug}`}
            className="flex gap-3 py-2.5 transition-colors hover:opacity-80"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-slate-700">
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
              <h4 className="line-clamp-2 text-sm font-medium text-slate-100">
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
    <div className="space-y-1">
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
            className="flex gap-3 py-2.5 transition-colors hover:opacity-80"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-slate-700">
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
              <h4 className="line-clamp-1 text-sm font-medium text-slate-100">
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
    <div className="space-y-1">
      {items.map((item, idx) => {
        const isRead = isChapterRead(item.manhuaSlug, item.chapterNumber);
        return (
          <Link
            key={`${item.manhuaSlug}-${item.chapterNumber}-${idx}`}
            href={`/manhua/${item.manhuaSlug}/chapter/${item.chapterNumber}`}
            className="flex gap-3 py-2.5 transition-colors hover:opacity-80"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-slate-700">
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
              <h4 className="line-clamp-1 text-sm font-medium text-slate-100">
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

