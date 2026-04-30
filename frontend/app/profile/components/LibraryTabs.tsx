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
  initialTab?: Tab;
}

type Tab = "favorites" | "bookmarks" | "recent";

export type LibraryTab = Tab;

const COVER_STYLE: React.CSSProperties = {
  width: 44, height: 60,
  borderRadius: 7,
  background: "var(--arc-elevated)",
  flexShrink: 0,
  overflow: "hidden",
  position: "relative",
};

function CoverThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <div style={COVER_STYLE}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="44px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px]" style={{ color: "var(--arc-muted)" }}>—</div>
      )}
    </div>
  );
}

function ItemRow({ href, cover, title, sub, isRead }: { href: string; cover?: string; title: string; sub?: React.ReactNode; isRead?: boolean }) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-[9px] px-3 py-2.5 transition-all hover:-translate-y-0.5"
      style={{ border: "1px solid transparent", textDecoration: "none" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border-h)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <CoverThumb src={cover} alt={title} />
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <h4
          className="line-clamp-2 text-[13px] font-semibold"
          style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
        >
          {title}
        </h4>
        {sub && <div className="mt-1 text-[11px]" style={{ color: isRead ? "var(--arc-muted)" : "var(--arc-dim)" }}>{sub}</div>}
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-6 text-center text-[13px]" style={{ color: "var(--arc-muted)" }}>{text}</div>;
}

export function LibraryTabs({ favorites, bookmarks, recentlyRead, initialTab }: LibraryTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "favorites");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "favorites", label: "Дуртай", count: favorites.length },
    { id: "bookmarks", label: "Хавтас", count: bookmarks.length },
    { id: "recent", label: "Сүүлд уншсан", count: recentlyRead.length },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "favorites":
        return favorites.length === 0 ? <EmptyState text="Дуртай манхуа алга" /> : (
          <div className="space-y-1">
            {favorites.map((f) => (
              <ItemRow key={f._id} href={`/manhua/${f.manhua.slug}`} cover={f.manhua.coverImageUrl || f.manhua.coverImage} title={f.manhua.title} />
            ))}
          </div>
        );
      case "bookmarks":
        return bookmarks.length === 0 ? <EmptyState text="Хавтас алга" /> : (
          <div className="space-y-1">
            {bookmarks.map((b) => {
              const isRead = isChapterRead(b.manhua.slug, b.chapterNumber);
              return (
                <ItemRow
                  key={b._id}
                  href={`/manhua/${b.manhua.slug}/chapter/${b.chapterNumber}`}
                  cover={b.manhua.coverImageUrl || b.manhua.coverImage}
                  title={b.manhua.title}
                  sub={<>Chapter {b.chapterNumber}{isRead ? " (уншсан)" : ""}</>}
                  isRead={isRead}
                />
              );
            })}
          </div>
        );
      case "recent":
        return recentlyRead.length === 0 ? <EmptyState text="Сүүлд уншсан манхуа алга" /> : (
          <div className="space-y-1">
            {recentlyRead.map((item, idx) => {
              const isRead = isChapterRead(item.manhuaSlug, item.chapterNumber);
              return (
                <ItemRow
                  key={`${item.manhuaSlug}-${item.chapterNumber}-${idx}`}
                  href={`/manhua/${item.manhuaSlug}/chapter/${item.chapterNumber}`}
                  cover={item.coverImageUrl}
                  title={item.manhuaTitle}
                  sub={<>Chapter {item.chapterNumber}{isRead ? " (уншсан)" : ""}</>}
                  isRead={isRead}
                />
              );
            })}
          </div>
        );
    }
  };

  return (
    <div
      className="rounded-[14px] p-4"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
    >
      {/* TABS */}
      <div className="mb-4 flex gap-0" style={{ borderBottom: "1px solid var(--arc-border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-[13px] font-semibold transition-colors"
            style={{
              fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
              border: "none",
              background: "transparent",
              color: activeTab === tab.id ? "var(--arc-cyan)" : "var(--arc-muted)",
              borderBottom: activeTab === tab.id ? "2px solid var(--arc-cyan)" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {tab.label} <span className="text-[11px] opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      <div>{renderContent()}</div>
    </div>
  );
}
