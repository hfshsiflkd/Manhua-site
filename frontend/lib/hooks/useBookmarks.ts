"use client";

import { useState, useCallback, useEffect } from "react";
import { toggleBookmark, getManhuaStatus } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function useBookmarks(manhuaId: string | null) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial status
  const loadStatus = useCallback(async () => {
    if (!manhuaId || !user) return;
    try {
      const status = await getManhuaStatus(manhuaId);
      setIsBookmarked(status.isBookmarked);
    } catch (err) {
      console.error("Failed to load bookmark status:", err);
    }
  }, [manhuaId, user]);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Toggle bookmark
  const toggle = useCallback(async () => {
    if (!manhuaId || isLoading) return;

    // Optimistic update
    const previousState = isBookmarked;
    setIsBookmarked(!previousState);
    setIsLoading(true);

    try {
      const result = await toggleBookmark(manhuaId);
      setIsBookmarked(result.isBookmarked);
    } catch (err) {
      // Revert on error
      setIsBookmarked(previousState);
      console.error("Failed to toggle bookmark:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [manhuaId, isBookmarked, isLoading]);

  return {
    isBookmarked,
    isLoading,
    toggle,
    loadStatus,
  };
}

