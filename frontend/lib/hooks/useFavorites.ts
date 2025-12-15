"use client";

import { useState, useCallback, useEffect } from "react";
import { toggleFavorite, getManhuaStatus } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function useFavorites(manhuaId: string | null) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial status
  const loadStatus = useCallback(async () => {
    if (!manhuaId || !user) return;
    try {
      const status = await getManhuaStatus(manhuaId);
      setIsFavorited(status.isFavorited);
    } catch (err) {
      console.error("Failed to load favorite status:", err);
    }
  }, [manhuaId, user]);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Toggle favorite
  const toggle = useCallback(async () => {
    if (!manhuaId || isLoading) return;

    // Optimistic update
    const previousState = isFavorited;
    setIsFavorited(!previousState);
    setIsLoading(true);

    try {
      const result = await toggleFavorite(manhuaId);
      setIsFavorited(result.isFavorited);
    } catch (err) {
      // Revert on error
      setIsFavorited(previousState);
      console.error("Failed to toggle favorite:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [manhuaId, isFavorited, isLoading]);

  return {
    isFavorited,
    isLoading,
    toggle,
    loadStatus,
  };
}

