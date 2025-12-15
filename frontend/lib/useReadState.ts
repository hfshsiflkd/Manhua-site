"use client";

import { useMemo } from "react";

const READ_CHAPTERS_KEY = "readChapterIds";

type ReadState = {
  isRead: boolean;
};

/**
 * Check if a chapter is read by the current user.
 * Uses localStorage to track read chapters (frontend fallback).
 * Format: { "manhuaSlug:chapterNumber": true }
 */
export function useReadState(
  manhuaSlug: string,
  chapterNumber: number | null | undefined
): ReadState {
  return useMemo(() => {
    if (!manhuaSlug || chapterNumber == null) {
      return { isRead: false };
    }

    try {
      const stored = localStorage.getItem(READ_CHAPTERS_KEY);
      if (!stored) return { isRead: false };

      const readChapters = JSON.parse(stored) as Record<string, boolean>;
      const key = `${manhuaSlug}:${chapterNumber}`;
      return { isRead: readChapters[key] === true };
    } catch {
      return { isRead: false };
    }
  }, [manhuaSlug, chapterNumber]);
}

/**
 * Mark a chapter as read in localStorage.
 * Call this when user views a chapter.
 */
export function markChapterAsRead(manhuaSlug: string, chapterNumber: number) {
  try {
    const stored = localStorage.getItem(READ_CHAPTERS_KEY);
    const readChapters = stored
      ? (JSON.parse(stored) as Record<string, boolean>)
      : {};

    const key = `${manhuaSlug}:${chapterNumber}`;
    readChapters[key] = true;

    // Limit to last 1000 chapters to prevent localStorage bloat
    const entries = Object.entries(readChapters);
    if (entries.length > 1000) {
      const recent = entries.slice(-1000);
      localStorage.setItem(
        READ_CHAPTERS_KEY,
        JSON.stringify(Object.fromEntries(recent))
      );
    } else {
      localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(readChapters));
    }
  } catch (err) {
    console.error("Failed to mark chapter as read:", err);
  }
}

/**
 * Check if a chapter is read (non-hook version for use in non-component contexts).
 */
export function isChapterRead(
  manhuaSlug: string,
  chapterNumber: number | null | undefined
): boolean {
  if (!manhuaSlug || chapterNumber == null) return false;

  try {
    const stored = localStorage.getItem(READ_CHAPTERS_KEY);
    if (!stored) return false;

    const readChapters = JSON.parse(stored) as Record<string, boolean>;
    const key = `${manhuaSlug}:${chapterNumber}`;
    return readChapters[key] === true;
  } catch {
    return false;
  }
}
