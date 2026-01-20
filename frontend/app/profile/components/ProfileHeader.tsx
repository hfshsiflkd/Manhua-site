"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAvatarUpload } from "@/lib/hooks/useAvatarUpload";
import Image from "next/image";

export function ProfileHeader() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { upload, isUploading, error, clearError } = useAvatarUpload();

  const formatVipDate = (d?: string | null) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return date.toLocaleDateString("mn-MN");
    } catch {
      return null;
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    const result = await upload(file);
    if (result) {
      setPreview(null);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!user) return null;

  const vipExpireText = formatVipDate(user.vipExpiresAt);
  const avatarUrl = preview || user.avatar;

  return (
    <div className="rounded-3xl bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/30 to-yellow-400/30 p-[1px] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_60%)]" />
        <div className="relative flex items-center gap-4">
        {/* Avatar with upload */}
        <div className="relative shrink-0">
        <button
          onClick={handleAvatarClick}
          disabled={isUploading}
          className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-yellow-400 text-lg font-semibold text-white shadow-[0_8px_24px_rgba(56,189,248,0.35)] ring-2 ring-white/20 transition-all hover:scale-[1.02] hover:opacity-95 disabled:opacity-50"
          title="Профайл зураг солих"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={user.username}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <span>{user.username.charAt(0).toUpperCase()}</span>
          )}
          {/* Edit overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-xs">📷</span>
          </div>
          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-slate-50">
              {user.username}
            </h2>
            {user.isVIP ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-yellow-300/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-900">
                VIP ✨
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                Энгийн
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{user.email}</p>
          {user.isVIP && vipExpireText && (
            <p className="mt-1 text-[10px] text-slate-500">
              VIP дуусах: {vipExpireText}
            </p>
          )}
        </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300">
          {error}
          <button
            onClick={clearError}
            className="ml-2 text-red-400 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

