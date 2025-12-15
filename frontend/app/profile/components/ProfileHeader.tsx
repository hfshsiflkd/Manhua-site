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
    <div className="relative flex items-center gap-3 pb-4">
      {/* Avatar with upload */}
      <div className="relative shrink-0">
        <button
          onClick={handleAvatarClick}
          disabled={isUploading}
          className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
          <h2 className="truncate text-base font-semibold text-slate-50">
            {user.username}
          </h2>
          {user.isVIP ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-yellow-300/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
              VIP ✨
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              Энгийн
            </span>
          )}
        </div>
        {user.isVIP && vipExpireText && (
          <p className="mt-0.5 text-[10px] text-slate-400">
            VIP дуусах: {vipExpireText}
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-300">
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

