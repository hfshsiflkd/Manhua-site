"use client";

import { useState, useCallback } from "react";
import { uploadAvatar, api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function useAvatarUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser, user } = useAuth();

  const upload = useCallback(
    async (file: File) => {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Зөвхөн JPG, PNG, WebP зураг ашиглана уу.");
        return null;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError("Зургийн хэмжээ 5MB-аас их байна.");
        return null;
      }

      setIsUploading(true);
      setError(null);

      try {
        const result = await uploadAvatar(file);
        // Update user in context
        if (user && result.avatar) {
          setUser({ ...user, avatar: result.avatar });
        }
        // Also update user from API to get full user object
        try {
          const meRes = await api.get("/auth/me");
          const userData = meRes.data?.user || meRes.data;
          if (userData) {
            setUser(userData);
          }
        } catch {
          // Ignore errors fetching updated user
        }
        return result.avatar;
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message || "Зураг ачаалах үед алдаа гарлаа.";
        setError(errorMessage);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [user, setUser]
  );

  return {
    upload,
    isUploading,
    error,
    clearError: () => setError(null),
  };
}

