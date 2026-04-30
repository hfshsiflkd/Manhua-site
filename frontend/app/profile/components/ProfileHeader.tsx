"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAvatarUpload } from "@/lib/hooks/useAvatarUpload";
import Image from "next/image";

type Tab = "reading" | "favorites" | "bookmarks" | "settings";

interface ProfileHeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  stats?: {
    readCount?: number;
    favoriteCount?: number;
    chapterCount?: number;
  };
}

export function ProfileHeader({ activeTab, onTabChange, stats }: ProfileHeaderProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { upload, isUploading, error, clearError } = useAvatarUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    const result = await upload(file);
    if (result) {
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) return null;

  const avatarUrl = preview || user.avatar;
  const initial = user.username.charAt(0).toUpperCase();

  const tabs: { id: Tab; label: string }[] = [
    { id: "reading", label: "Унших явц" },
    { id: "favorites", label: "Дуртай" },
    { id: "bookmarks", label: "Хавтас" },
    { id: "settings", label: "Тохиргоо" },
  ];

  return (
    <>
      {/* Hero section */}
      <div
        className="relative"
        style={{
          background: "linear-gradient(180deg,#0d0920 0%,var(--arc-bg) 100%)",
          borderBottom: "1px solid var(--arc-border)",
          padding: "40px 24px 0",
        }}
      >
        {/* Cyan radial glow — clipped to the hero */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 70% 100% at 50% -10%,oklch(0.72 0.17 195/.1),transparent)" }}
          />
        </div>

        {/* Avatar + info row */}
        <div
          className="relative mx-auto flex gap-6"
          style={{ maxWidth: 1100, alignItems: "flex-end" }}
        >
          {/* Avatar — negative margin makes tabs start 24px higher */}
          <div style={{ flexShrink: 0, marginBottom: -24, position: "relative", zIndex: 2 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="relative flex items-center justify-center overflow-hidden transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                width: 88, height: 88,
                borderRadius: 22,
                background: "linear-gradient(135deg,oklch(0.72 0.17 195),oklch(0.65 0.22 15))",
                border: "3px solid var(--arc-bg)",
                boxShadow: "0 8px 24px rgba(0,0,0,.5)",
                fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
                fontSize: 32, fontWeight: 700, color: "#fff",
                cursor: "pointer",
              }}
              title="Профайл зураг солих"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={user.username} fill sizes="88px" className="object-cover" />
              ) : (
                <span>{initial}</span>
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.7)", borderRadius: 19 }}>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pb-5">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h1
                className="text-[22px] font-bold"
                style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff", letterSpacing: "-0.02em" }}
              >
                {user.username}
              </h1>
              {user.isVIP ? (
                <span
                  className="rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))", color: "#07070e" }}
                >
                  ⭐ VIP
                </span>
              ) : (
                <span
                  className="rounded-md px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}
                >
                  Энгийн
                </span>
              )}
            </div>
            <p className="text-[12px] mb-3" style={{ color: "var(--arc-muted)" }}>{user.email}</p>

            {/* Stats row */}
            <div className="flex gap-5 flex-wrap">
              {[
                { val: stats?.readCount, label: "Уншсан" },
                { val: stats?.favoriteCount, label: "Дуртай" },
                { val: stats?.chapterCount !== undefined ? stats.chapterCount.toLocaleString() : undefined, label: "Chapter" },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div className="text-[18px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff" }}>
                    {val ?? "—"}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--arc-muted)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar — 32px top padding leaves room for avatar's -24px margin (8px visual gap) */}
        <div
          className="relative mx-auto flex"
          style={{ maxWidth: 1100, paddingTop: 32 }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: "10px 20px",
                fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
                fontSize: 13, fontWeight: 600,
                color: activeTab === tab.id ? "var(--arc-cyan)" : "var(--arc-muted)",
                cursor: "pointer",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === tab.id ? "2px solid var(--arc-cyan)" : "2px solid transparent",
                marginBottom: -1,
                transition: "color .15s, border-color .15s",
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "var(--arc-text)"; }}
              onMouseLeave={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "var(--arc-muted)"; }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="mx-auto mt-3 flex items-center justify-between rounded-[10px] px-3 py-2 text-[12px]"
          style={{ maxWidth: 1100, background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}
        >
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </>
  );
}
