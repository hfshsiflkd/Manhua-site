"use client";

import { useState, useCallback } from "react";
import { uploadImage, api } from "@/lib/api";
import { validateImageFile } from "@/lib/imageLimits";
import { useAuth } from "@/context/AuthContext";

export function useAvatarUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser, user } = useAuth();

  const upload = useCallback(
    async (file: File) => {
      const problem = validateImageFile(file, "avatar");
      if (problem) {
        setError(problem);
        return null;
      }

      setIsUploading(true);
      setError(null);

      try {
        const result = await uploadImage(file, undefined, "avatar", {
          onPhase: () => {},
        });
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
        return result.avatar || result.url || null;
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

